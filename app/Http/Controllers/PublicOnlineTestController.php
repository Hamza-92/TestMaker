<?php

namespace App\Http\Controllers;

use App\Models\OnlineTest;
use App\Models\OnlineTestAnswer;
use App\Models\OnlineTestAttempt;
use App\Models\OnlineTestQuestion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class PublicOnlineTestController extends Controller
{
    public function show(Request $request, string $token): Response|RedirectResponse
    {
        $test = $this->publishedTest($token);
        $cookieName = $this->attemptCookieName($token);
        $attemptToken = $request->cookie($cookieName);

        if ($attemptToken) {
            $attempt = OnlineTestAttempt::query()
                ->where('attempt_token', $attemptToken)
                ->where('online_test_id', $test->id)
                ->first();

            if ($attempt && $attempt->status === 'in_progress') {
                if ($this->attemptHasExpired($attempt, $test)) {
                    $this->finalizeAttempt($attempt, 'expired');

                    return redirect()
                        ->route('online-tests.public.complete', $attempt->attempt_token)
                        ->withoutCookie(cookie()->forget($cookieName));
                }

                return redirect()->route('online-tests.public.attempt', $attempt->attempt_token);
            }
        }

        return Inertia::render('online-tests/start', [
            'test' => $this->publicTestSummary($test),
            'availability' => $this->availability($test),
            'shareToken' => $token,
        ])->toResponse($request);
    }

    public function start(Request $request, string $token): RedirectResponse
    {
        $test = $this->publishedTest($token);
        $availability = $this->availability($test);

        if ($availability['status'] !== 'open') {
            return back()->withErrors([
                'test' => $availability['message'],
            ]);
        }

        $data = $request->validate([
            'student_name' => ['required', 'string', 'max:255'],
            'student_class' => ['required', 'string', 'max:255'],
            'roll_number' => ['required', 'string', 'max:255'],
        ]);

        $normalizedRollNumber = $this->normalizeRollNumber($data['roll_number']);
        $existing = OnlineTestAttempt::query()
            ->where('online_test_id', $test->id)
            ->where('roll_number_normalized', $normalizedRollNumber)
            ->first();

        if ($existing) {
            if ($existing->status === 'in_progress' && ! $this->attemptHasExpired($existing, $test)) {
                return back()->withErrors([
                    'roll_number' => 'This roll number has already started the test on another browser.',
                ]);
            }

            return back()->withErrors([
                'roll_number' => 'This roll number has already used its attempt.',
            ]);
        }

        $questionOrder = $test->questions->pluck('id');
        if ($test->shuffle_questions) {
            $questionOrder = $questionOrder->shuffle();
        }

        $expiresAt = $test->timing_mode === 'whole_test'
            ? now()->addMinutes($test->duration_minutes)
            : null;

        if ($test->available_until && ($expiresAt === null || $test->available_until->isBefore($expiresAt))) {
            $expiresAt = $test->available_until;
        }

        $attempt = OnlineTestAttempt::create([
            'online_test_id' => $test->id,
            'attempt_token' => Str::random(48),
            'student_name' => $data['student_name'],
            'student_class' => $data['student_class'],
            'roll_number' => $data['roll_number'],
            'roll_number_normalized' => $normalizedRollNumber,
            'status' => 'in_progress',
            'current_index' => 0,
            'furthest_index' => 0,
            'score' => 0,
            'total_questions' => $questionOrder->count(),
            'question_order' => $questionOrder->values()->all(),
            'focus_loss_count' => 0,
            'started_at' => now(),
            'question_started_at' => now(),
            'expires_at' => $expiresAt,
        ]);

        return redirect()
            ->route('online-tests.public.attempt', $attempt->attempt_token)
            ->cookie(cookie()->make(
                $this->attemptCookieName($token),
                $attempt->attempt_token,
                max(180, $test->duration_minutes + 180),
            ));
    }

    public function attempt(Request $request, string $attemptToken): Response|RedirectResponse
    {
        $attempt = $this->findAttempt($attemptToken);

        if ($attempt->status !== 'in_progress') {
            return redirect()->route('online-tests.public.complete', $attempt->attempt_token);
        }

        if ($this->attemptHasExpired($attempt, $attempt->onlineTest)) {
            $this->finalizeAttempt($attempt, 'expired');

            return $this->completeRedirect($attempt);
        }

        if ($this->questionHasExpired($attempt)) {
            return $this->advanceOrComplete($attempt, 'expired');
        }

        $question = $this->currentQuestion($attempt);
        if (! $question) {
            $this->finalizeAttempt($attempt, 'submitted');

            return $this->completeRedirect($attempt);
        }

        $answer = $attempt->answers->firstWhere('online_test_question_id', $question->id);

        return Inertia::render('online-tests/attempt', [
            'test' => [
                ...$this->publicTestSummary($attempt->onlineTest),
                'auto_advance' => $attempt->onlineTest->auto_advance,
                'allow_back_navigation' => $attempt->onlineTest->allow_back_navigation,
                'allow_skip' => $attempt->onlineTest->allow_skip,
                'focus_loss_action' => $attempt->onlineTest->focus_loss_action,
                'require_fullscreen' => $attempt->onlineTest->require_fullscreen,
            ],
            'attempt' => [
                'attempt_token' => $attempt->attempt_token,
                'student_name' => $attempt->student_name,
                'student_class' => $attempt->student_class,
                'roll_number' => $attempt->roll_number,
                'current_index' => $attempt->current_index,
                'furthest_index' => $attempt->furthest_index,
                'answered_indices' => $this->answeredIndices($attempt),
                'selected_option_key' => $answer?->selected_option_key,
                'expires_at' => $attempt->expires_at?->toISOString(),
                'question_expires_at' => $this->questionExpiresAt($attempt)?->toISOString(),
            ],
            'question' => [
                'id' => $question->id,
                'number' => $attempt->current_index + 1,
                'prompt_en' => data_get($question->payload, 'prompt_en'),
                'prompt_ur' => data_get($question->payload, 'prompt_ur'),
                'chapter_name' => data_get($question->payload, 'chapter_name'),
                'topic_name' => data_get($question->payload, 'topic_name'),
                'options' => $this->displayOptions($attempt, $question),
            ],
        ])->toResponse($request);
    }

    public function answer(Request $request, string $attemptToken): RedirectResponse
    {
        $attempt = $this->findAttempt($attemptToken);

        if ($attempt->status !== 'in_progress') {
            return redirect()->route('online-tests.public.complete', $attempt->attempt_token);
        }

        if ($this->attemptHasExpired($attempt, $attempt->onlineTest)) {
            $this->finalizeAttempt($attempt, 'expired');

            return $this->completeRedirect($attempt);
        }

        if ($this->questionHasExpired($attempt)) {
            return $this->advanceOrComplete($attempt, 'expired');
        }

        $question = $this->currentQuestion($attempt);
        abort_if(! $question, 404);

        $data = $request->validate([
            'question_id' => ['required', 'integer'],
            'selected_option_key' => [Rule::requiredIf(! $attempt->onlineTest->allow_skip), 'nullable', 'string'],
            'direction' => ['nullable', Rule::in(['next', 'stay'])],
        ]);
        abort_unless((int) $data['question_id'] === (int) $question->id, 409);

        $selectedKey = isset($data['selected_option_key']) ? (string) $data['selected_option_key'] : null;
        if ($selectedKey !== null) {
            $optionKeys = collect(data_get($question->payload, 'options', []))
                ->pluck('key')
                ->map(fn ($key) => (string) $key)
                ->all();
            abort_unless(in_array($selectedKey, $optionKeys, true), 422);
        }

        DB::transaction(function () use ($attempt, $question, $selectedKey) {
            if ($selectedKey !== null) {
                OnlineTestAnswer::query()->updateOrCreate(
                    [
                        'online_test_attempt_id' => $attempt->id,
                        'online_test_question_id' => $question->id,
                    ],
                    [
                        'selected_option_key' => $selectedKey,
                        'is_correct' => (string) $question->correct_option_key === $selectedKey,
                        'answered_at' => now(),
                    ]
                );
            }
        });

        if (($data['direction'] ?? 'next') === 'stay') {
            return redirect()->route('online-tests.public.attempt', $attempt->attempt_token);
        }

        return $this->advanceOrComplete($attempt->fresh(), 'submitted');
    }

    public function navigate(Request $request, string $attemptToken): RedirectResponse
    {
        $attempt = $this->findAttempt($attemptToken);
        abort_unless($attempt->status === 'in_progress', 409);
        abort_unless($attempt->onlineTest->allow_back_navigation, 403);

        $data = $request->validate([
            'index' => ['required', 'integer', 'min:0', 'max:'.max(0, $attempt->total_questions - 1)],
        ]);
        abort_unless((int) $data['index'] <= $attempt->furthest_index, 422);

        $attempt->update(['current_index' => (int) $data['index']]);

        return redirect()->route('online-tests.public.attempt', $attempt->attempt_token);
    }

    public function timeout(Request $request, string $attemptToken): RedirectResponse
    {
        $attempt = $this->findAttempt($attemptToken);
        abort_unless($attempt->onlineTest->timing_mode === 'per_question', 422);

        if ($attempt->status !== 'in_progress') {
            return $this->completeRedirect($attempt);
        }

        $data = $request->validate(['question_id' => ['required', 'integer']]);
        $question = $this->currentQuestion($attempt);

        if (! $question || (int) $data['question_id'] !== (int) $question->id) {
            return redirect()->route('online-tests.public.attempt', $attempt->attempt_token);
        }

        return $this->advanceOrComplete($attempt, 'expired');
    }

    public function focusLoss(string $attemptToken): RedirectResponse
    {
        $attempt = $this->findAttempt($attemptToken);

        if ($attempt->status !== 'in_progress') {
            return $this->completeRedirect($attempt);
        }

        $attempt->increment('focus_loss_count');

        if ($attempt->onlineTest->focus_loss_action === 'submit') {
            $this->finalizeAttempt($attempt->fresh(), 'submitted');

            return $this->completeRedirect($attempt);
        }

        return redirect()->route('online-tests.public.attempt', $attempt->attempt_token);
    }

    public function submit(string $attemptToken): RedirectResponse
    {
        $attempt = $this->findAttempt($attemptToken);

        if ($attempt->status === 'in_progress') {
            $this->finalizeAttempt(
                $attempt,
                $this->attemptHasExpired($attempt, $attempt->onlineTest) ? 'expired' : 'submitted',
            );
        }

        return $this->completeRedirect($attempt);
    }

    public function complete(Request $request, string $attemptToken): Response
    {
        $attempt = $this->findAttempt($attemptToken);
        $test = $attempt->onlineTest;
        $percentage = $attempt->total_questions > 0
            ? (int) round(($attempt->score / $attempt->total_questions) * 100)
            : 0;

        return Inertia::render('online-tests/complete', [
            'test' => [
                'title' => $test->title,
                'show_result' => $test->show_result,
                'show_correct_answers' => $test->show_correct_answers,
                'passing_percentage' => $test->passing_percentage,
            ],
            'attempt' => [
                'student_name' => $attempt->student_name,
                'student_class' => $attempt->student_class,
                'roll_number' => $attempt->roll_number,
                'status' => $attempt->status,
                'score' => $test->show_result ? $attempt->score : null,
                'total_questions' => $test->show_result ? $attempt->total_questions : null,
                'percentage' => $test->show_result ? $percentage : null,
                'passed' => $test->show_result ? $percentage >= $test->passing_percentage : null,
                'submitted_at' => $attempt->submitted_at?->toISOString(),
            ],
            'review' => $test->show_result && $test->show_correct_answers
                ? $this->answerReview($attempt)
                : [],
        ])->toResponse($request);
    }

    private function publishedTest(string $token): OnlineTest
    {
        return OnlineTest::query()
            ->where('share_token', $token)
            ->where('status', 'published')
            ->with(['questions' => fn ($query) => $query->orderBy('sort_order')])
            ->firstOrFail();
    }

    private function findAttempt(string $attemptToken): OnlineTestAttempt
    {
        return OnlineTestAttempt::query()
            ->where('attempt_token', $attemptToken)
            ->with([
                'onlineTest',
                'onlineTest.questions' => fn ($query) => $query->orderBy('sort_order'),
                'answers',
            ])
            ->firstOrFail();
    }

    private function currentQuestion(OnlineTestAttempt $attempt): ?OnlineTestQuestion
    {
        $questionId = collect($attempt->question_order)->get($attempt->current_index);

        return $attempt->onlineTest->questions->firstWhere('id', $questionId);
    }

    private function orderedQuestions(OnlineTestAttempt $attempt): Collection
    {
        $questions = $attempt->onlineTest->questions->keyBy('id');

        return collect($attempt->question_order)
            ->map(fn ($id) => $questions->get((int) $id))
            ->filter()
            ->values();
    }

    private function displayOptions(OnlineTestAttempt $attempt, OnlineTestQuestion $question): array
    {
        $options = collect(data_get($question->payload, 'options', []));

        if ($attempt->onlineTest->shuffle_options) {
            $options = $options->sortBy(fn ($option) => hash(
                'sha256',
                $attempt->attempt_token.':'.$question->id.':'.data_get($option, 'key')
            ));
        }

        return $options->values()->map(fn ($option, int $index) => [
            ...$option,
            'label' => chr(65 + $index),
        ])->all();
    }

    private function advanceOrComplete(OnlineTestAttempt $attempt, string $completionStatus): RedirectResponse
    {
        $nextIndex = $attempt->current_index + 1;

        if ($nextIndex >= $attempt->total_questions) {
            $this->finalizeAttempt($attempt, $completionStatus);

            return $this->completeRedirect($attempt);
        }

        $attempt->update([
            'current_index' => $nextIndex,
            'furthest_index' => max($attempt->furthest_index, $nextIndex),
            'question_started_at' => now(),
        ]);

        return redirect()->route('online-tests.public.attempt', $attempt->attempt_token);
    }

    private function completeRedirect(OnlineTestAttempt $attempt): RedirectResponse
    {
        return redirect()
            ->route('online-tests.public.complete', $attempt->attempt_token)
            ->withoutCookie(cookie()->forget($this->attemptCookieName($attempt->onlineTest->share_token)));
    }

    private function attemptHasExpired(OnlineTestAttempt $attempt, OnlineTest $test): bool
    {
        return ($attempt->expires_at && $attempt->expires_at->isPast())
            || ($test->available_until && $test->available_until->isPast());
    }

    private function questionHasExpired(OnlineTestAttempt $attempt): bool
    {
        return $attempt->onlineTest->timing_mode === 'per_question'
            && $this->questionExpiresAt($attempt)?->isPast();
    }

    private function questionExpiresAt(OnlineTestAttempt $attempt)
    {
        if ($attempt->onlineTest->timing_mode !== 'per_question' || ! $attempt->question_started_at) {
            return null;
        }

        return $attempt->question_started_at
            ->copy()
            ->addSeconds($attempt->onlineTest->question_time_seconds);
    }

    private function availability(OnlineTest $test): array
    {
        if ($test->available_from && $test->available_from->isFuture()) {
            return [
                'status' => 'upcoming',
                'message' => 'This test opens '.$test->available_from->format('M j, Y \a\t g:i A').'.',
            ];
        }

        if ($test->available_until && $test->available_until->isPast()) {
            return [
                'status' => 'closed',
                'message' => 'The submission window for this test has closed.',
            ];
        }

        return ['status' => 'open', 'message' => null];
    }

    private function publicTestSummary(OnlineTest $test): array
    {
        return [
            'title' => $test->title,
            'instructions' => $test->instructions,
            'timing_mode' => $test->timing_mode,
            'duration_minutes' => $test->duration_minutes,
            'question_time_seconds' => $test->question_time_seconds,
            'question_count' => $test->questions->count(),
            'allow_back_navigation' => $test->allow_back_navigation,
            'allow_skip' => $test->allow_skip,
            'shuffle_questions' => $test->shuffle_questions,
            'focus_loss_action' => $test->focus_loss_action,
            'require_fullscreen' => $test->require_fullscreen,
        ];
    }

    private function answeredIndices(OnlineTestAttempt $attempt): array
    {
        $answerIds = $attempt->answers->pluck('online_test_question_id')->flip();

        return collect($attempt->question_order)
            ->map(fn ($id, $index) => $answerIds->has($id) ? $index : null)
            ->filter(fn ($index) => $index !== null)
            ->values()
            ->all();
    }

    private function answerReview(OnlineTestAttempt $attempt): array
    {
        $answers = $attempt->answers->keyBy('online_test_question_id');

        return $this->orderedQuestions($attempt)->map(function ($question, int $index) use ($answers) {
            $answer = $answers->get($question->id);
            $options = collect(data_get($question->payload, 'options', []));

            return [
                'number' => $index + 1,
                'prompt' => data_get($question->payload, 'prompt_en')
                    ?? data_get($question->payload, 'prompt_ur')
                    ?? 'Question',
                'selected_answer' => data_get($options->firstWhere('key', $answer?->selected_option_key), 'text_en')
                    ?? data_get($options->firstWhere('key', $answer?->selected_option_key), 'text_ur'),
                'correct_answer' => data_get($options->firstWhere('key', $question->correct_option_key), 'text_en')
                    ?? data_get($options->firstWhere('key', $question->correct_option_key), 'text_ur'),
                'is_correct' => (bool) $answer?->is_correct,
            ];
        })->all();
    }

    private function finalizeAttempt(OnlineTestAttempt $attempt, string $status): void
    {
        if ($attempt->status !== 'in_progress') {
            return;
        }

        $score = $attempt->answers()->where('is_correct', true)->count();

        $attempt->update([
            'status' => $status,
            'score' => $score,
            'current_index' => $attempt->total_questions,
            'furthest_index' => max($attempt->furthest_index, $attempt->total_questions),
            'submitted_at' => now(),
        ]);
    }

    private function normalizeRollNumber(string $value): string
    {
        return Str::lower(preg_replace('/\s+/', '', trim($value)) ?? trim($value));
    }

    private function attemptCookieName(string $shareToken): string
    {
        return 'online_test_attempt_'.md5($shareToken);
    }
}
