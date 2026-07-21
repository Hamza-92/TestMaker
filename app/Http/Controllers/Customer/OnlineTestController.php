<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\OnlineTest;
use App\Models\Pattern;
use App\Models\Question;
use App\Support\AppUserAccess;
use App\Support\OnlineTests\OnlineTestQuestionMapper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class OnlineTestController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $schoolOwner = $user->schoolOwner();
        abort_if($schoolOwner === null, 403);

        $tests = OnlineTest::query()
            ->where('school_id', $schoolOwner->id)
            ->when($user->isTeacher(), fn ($query) => $query->where('created_by', $user->id))
            ->with(['creator:id,name', 'subject:id,name_eng', 'schoolClass:id,name'])
            ->withCount(['questions', 'attempts'])
            ->latest('updated_at')
            ->get()
            ->map(fn (OnlineTest $test) => [
                'id' => $test->id,
                'title' => $test->title,
                'status' => $test->status,
                'duration_minutes' => $test->duration_minutes,
                'question_count' => (int) $test->questions_count,
                'attempt_count' => (int) $test->attempts_count,
                'creator_name' => $test->creator?->name,
                'subject_name' => $test->subject?->name_eng,
                'class_name' => $test->schoolClass?->name,
                'published_at' => $test->published_at?->toISOString(),
                'updated_at' => $test->updated_at?->toISOString(),
            ]);

        return Inertia::render('customer/online-tests/index', [
            'tests' => $tests,
            'isOwner' => $user->isSchoolOwner(),
        ]);
    }

    public function create()
    {
        return Inertia::render('customer/online-tests/create', $this->catalogProps());
    }

    public function store(Request $request)
    {
        $validated = $this->validatePayload($request);
        $this->ensureSubjectAccess($validated);
        $questions = $this->selectedQuestions($validated);

        $user = auth()->user();
        $schoolOwner = $user->schoolOwner();
        abort_if($schoolOwner === null, 403);

        $onlineTest = DB::transaction(function () use ($validated, $questions, $schoolOwner, $user) {
            $onlineTest = OnlineTest::create([
                'school_id' => $schoolOwner->id,
                'created_by' => $user->id,
                'pattern_id' => $validated['pattern_id'],
                'class_id' => $validated['class_id'],
                'subject_id' => $validated['subject_id'],
                'title' => $validated['title'],
                'instructions' => $validated['instructions'] ?? null,
                'duration_minutes' => $validated['duration_minutes'],
                ...$this->deliverySettings($validated),
                'status' => 'draft',
            ]);

            $this->syncDraftQuestions($onlineTest, $questions);

            return $onlineTest;
        });

        return redirect()
            ->route('customer.online-tests.show', $onlineTest)
            ->with('success', 'Online test created.');
    }

    public function show(OnlineTest $onlineTest)
    {
        $this->authorizeTest($onlineTest);

        $onlineTest->load([
            'creator:id,name',
            'pattern:id,name',
            'schoolClass:id,name',
            'subject:id,name_eng',
            'questions' => fn ($query) => $query->orderBy('sort_order'),
            'attempts' => fn ($query) => $query->latest('created_at'),
        ]);

        return Inertia::render('customer/online-tests/show', [
            'test' => [
                'id' => $onlineTest->id,
                'title' => $onlineTest->title,
                'instructions' => $onlineTest->instructions,
                'status' => $onlineTest->status,
                'duration_minutes' => $onlineTest->duration_minutes,
                'timing_mode' => $onlineTest->timing_mode,
                'question_time_seconds' => $onlineTest->question_time_seconds,
                'auto_advance' => $onlineTest->auto_advance,
                'allow_back_navigation' => $onlineTest->allow_back_navigation,
                'allow_skip' => $onlineTest->allow_skip,
                'shuffle_questions' => $onlineTest->shuffle_questions,
                'shuffle_options' => $onlineTest->shuffle_options,
                'focus_loss_action' => $onlineTest->focus_loss_action,
                'require_fullscreen' => $onlineTest->require_fullscreen,
                'show_result' => $onlineTest->show_result,
                'show_correct_answers' => $onlineTest->show_correct_answers,
                'passing_percentage' => $onlineTest->passing_percentage,
                'available_from' => $onlineTest->available_from?->toISOString(),
                'available_until' => $onlineTest->available_until?->toISOString(),
                'creator_name' => $onlineTest->creator?->name,
                'pattern_name' => $onlineTest->pattern?->name,
                'class_name' => $onlineTest->schoolClass?->name,
                'subject_name' => $onlineTest->subject?->name_eng,
                'question_count' => $onlineTest->questions->count(),
                'attempt_count' => $onlineTest->attempts->count(),
                'public_link' => $onlineTest->share_token ? url("/take-test/{$onlineTest->share_token}") : null,
                'published_at' => $onlineTest->published_at?->toISOString(),
                'closed_at' => $onlineTest->closed_at?->toISOString(),
                'can_edit' => $onlineTest->status === 'draft',
            ],
            'questions' => $onlineTest->questions->map(fn ($question) => [
                'id' => $question->id,
                'prompt' => data_get($question->payload, 'prompt_en')
                    ?? data_get($question->payload, 'prompt_ur')
                    ?? 'Question',
                'option_count' => count(data_get($question->payload, 'options', [])),
                'sort_order' => $question->sort_order,
            ])->values(),
            'attempts' => $onlineTest->attempts->map(fn ($attempt) => [
                'id' => $attempt->id,
                'student_name' => $attempt->student_name,
                'student_class' => $attempt->student_class,
                'roll_number' => $attempt->roll_number,
                'status' => $attempt->status,
                'score' => $attempt->score,
                'total_questions' => $attempt->total_questions,
                'focus_loss_count' => $attempt->focus_loss_count,
                'started_at' => $attempt->started_at?->toISOString(),
                'submitted_at' => $attempt->submitted_at?->toISOString(),
            ])->values(),
        ]);
    }

    public function edit(OnlineTest $onlineTest)
    {
        $this->authorizeDraftTest($onlineTest);

        $onlineTest->load('questions');
        $props = $this->catalogProps();
        $props['test'] = [
            'id' => $onlineTest->id,
            'title' => $onlineTest->title,
            'instructions' => $onlineTest->instructions,
            'duration_minutes' => $onlineTest->duration_minutes,
            'timing_mode' => $onlineTest->timing_mode,
            'question_time_seconds' => $onlineTest->question_time_seconds,
            'auto_advance' => $onlineTest->auto_advance,
            'allow_back_navigation' => $onlineTest->allow_back_navigation,
            'allow_skip' => $onlineTest->allow_skip,
            'shuffle_questions' => $onlineTest->shuffle_questions,
            'shuffle_options' => $onlineTest->shuffle_options,
            'focus_loss_action' => $onlineTest->focus_loss_action,
            'require_fullscreen' => $onlineTest->require_fullscreen,
            'show_result' => $onlineTest->show_result,
            'show_correct_answers' => $onlineTest->show_correct_answers,
            'passing_percentage' => $onlineTest->passing_percentage,
            'available_from' => $onlineTest->available_from?->format('Y-m-d\TH:i'),
            'available_until' => $onlineTest->available_until?->format('Y-m-d\TH:i'),
            'pattern_id' => $onlineTest->pattern_id,
            'class_id' => $onlineTest->class_id,
            'subject_id' => $onlineTest->subject_id,
            'question_ids' => $onlineTest->questions
                ->pluck('question_id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all(),
            'chapter_ids' => $onlineTest->questions
                ->pluck('chapter_id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all(),
        ];

        return Inertia::render('customer/online-tests/edit', $props);
    }

    public function update(Request $request, OnlineTest $onlineTest)
    {
        $this->authorizeDraftTest($onlineTest);
        $validated = $this->validatePayload($request);
        $this->ensureSubjectAccess($validated);
        $questions = $this->selectedQuestions($validated);

        DB::transaction(function () use ($onlineTest, $validated, $questions) {
            $onlineTest->update([
                'pattern_id' => $validated['pattern_id'],
                'class_id' => $validated['class_id'],
                'subject_id' => $validated['subject_id'],
                'title' => $validated['title'],
                'instructions' => $validated['instructions'] ?? null,
                'duration_minutes' => $validated['duration_minutes'],
                ...$this->deliverySettings($validated),
            ]);

            $this->syncDraftQuestions($onlineTest, $questions);
        });

        return redirect()
            ->route('customer.online-tests.show', $onlineTest)
            ->with('success', 'Online test updated.');
    }

    public function publish(OnlineTest $onlineTest)
    {
        $this->authorizeTest($onlineTest);

        if ($onlineTest->status === 'closed') {
            return back()->withErrors([
                'publish' => 'Closed tests cannot be published again.',
            ]);
        }

        $questionIds = $onlineTest->questions()
            ->pluck('question_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->values();

        $questions = Question::query()
            ->whereIn('id', $questionIds)
            ->with(['questionType:id,name,schema_key,is_objective', 'options', 'chapter:id,name', 'topic:id,name'])
            ->get()
            ->sortBy(fn (Question $question) => $questionIds->search($question->id))
            ->values();

        $snapshots = OnlineTestQuestionMapper::normalizeQuestionSelection($questions);

        if ($questionIds->count() === 0 || count($snapshots) !== $questionIds->count()) {
            return back()->withErrors([
                'publish' => 'Some selected questions are no longer valid for online MCQ tests. Edit the draft and reselect the questions.',
            ]);
        }

        DB::transaction(function () use ($onlineTest, $snapshots) {
            $onlineTest->questions()->delete();
            $onlineTest->questions()->createMany($snapshots);
            $onlineTest->update([
                'status' => 'published',
                'share_token' => $onlineTest->share_token ?: Str::random(40),
                'published_at' => now(),
                'closed_at' => null,
            ]);
        });

        return back()->with('success', 'Online test published.');
    }

    public function unpublish(OnlineTest $onlineTest)
    {
        $this->authorizeTest($onlineTest);

        if ($onlineTest->attempts()->exists()) {
            return back()->withErrors([
                'status' => 'A test with student attempts cannot be moved back to draft.',
            ]);
        }

        $onlineTest->update([
            'status' => 'draft',
            'published_at' => null,
            'closed_at' => null,
        ]);

        return back()->with('success', 'Online test moved back to draft.');
    }

    public function close(OnlineTest $onlineTest)
    {
        $this->authorizeTest($onlineTest);

        $onlineTest->update([
            'status' => 'closed',
            'closed_at' => now(),
        ]);

        return back()->with('success', 'Online test closed.');
    }

    public function regenerateLink(OnlineTest $onlineTest)
    {
        $this->authorizeTest($onlineTest);

        if ($onlineTest->status !== 'published') {
            return back()->withErrors([
                'link' => 'Only published tests can generate a share link.',
            ]);
        }

        $onlineTest->update([
            'share_token' => Str::random(40),
        ]);

        return back()->with('success', 'Share link regenerated.');
    }

    public function chapters(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pattern_id' => 'required|integer|exists:patterns,id',
            'class_id' => 'required|integer|exists:classes,id',
            'subject_id' => 'required|integer|exists:subjects,id',
        ]);

        $this->ensureSubjectAccess($data);

        $chapters = Chapter::query()
            ->where('pattern_id', $data['pattern_id'])
            ->where('class_id', $data['class_id'])
            ->where('subject_id', $data['subject_id'])
            ->where('status', 1)
            ->withCount(['questions as question_count' => fn ($query) => $query
                ->where('status', 1)
                ->whereHas('questionType', fn ($typeQuery) => $typeQuery->where('is_objective', true))])
            ->with(['topics' => fn ($query) => $query
                ->where('status', 1)
                ->orderBy('sort_id')
                ->orderBy('id')
                ->select('id', 'chapter_id', 'name')
                ->withCount(['questions as question_count' => fn ($questionQuery) => $questionQuery
                    ->where('status', 1)
                    ->whereHas('questionType', fn ($typeQuery) => $typeQuery->where('is_objective', true))])])
            ->orderBy('group_name')
            ->orderBy('group_heading')
            ->orderBy('chapter_number')
            ->orderBy('sort_id')
            ->orderBy('id')
            ->get(['id', 'name', 'chapter_number', 'group_name', 'group_heading'])
            ->map(fn (Chapter $chapter) => [
                'id' => $chapter->id,
                'name' => $chapter->name,
                'chapter_number' => $chapter->chapter_number,
                'group_name' => $chapter->group_name,
                'group_heading' => $chapter->group_heading,
                'question_count' => (int) ($chapter->question_count ?? 0),
                'topics' => $chapter->topics->map(fn ($topic) => [
                    'id' => $topic->id,
                    'name' => $topic->name,
                    'question_count' => (int) ($topic->question_count ?? 0),
                ])->values(),
            ])
            ->values();

        return response()->json(['chapters' => $chapters]);
    }

    public function questions(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pattern_id' => 'required|integer|exists:patterns,id',
            'class_id' => 'required|integer|exists:classes,id',
            'subject_id' => 'required|integer|exists:subjects,id',
            'chapter_ids' => ['required', 'array', 'min:1'],
            'chapter_ids.*' => ['integer', 'exists:chapters,id'],
            'topic_ids' => ['array'],
            'topic_ids.*' => ['integer', 'exists:topics,id'],
            'sources' => ['array'],
            'sources.*' => ['string', Rule::in(Question::sourceValues())],
            'difficulties' => ['array'],
            'difficulties.*' => ['string', Rule::in(Question::difficultyValues())],
        ]);

        $this->ensureSubjectAccess($data);

        $chapterIds = collect($data['chapter_ids'])->map(fn ($id) => (int) $id)->unique()->values();
        $this->ensureChapterScope($chapterIds, $data);

        $topicIds = collect($data['topic_ids'] ?? [])->map(fn ($id) => (int) $id)->unique()->values();
        $topicsByChapter = collect();
        if ($topicIds->isNotEmpty()) {
            $selectedTopics = DB::table('topics')
                ->whereIn('id', $topicIds)
                ->whereIn('chapter_id', $chapterIds)
                ->get(['id', 'chapter_id']);
            abort_unless($selectedTopics->count() === $topicIds->count(), 422);
            $topicsByChapter = $selectedTopics->groupBy('chapter_id');
        }

        $questions = Question::query()
            ->where('status', 1)
            ->where(function ($query) use ($chapterIds, $topicsByChapter) {
                foreach ($chapterIds as $chapterId) {
                    $selectedTopicIds = $topicsByChapter
                        ->get($chapterId, collect())
                        ->pluck('id');

                    $query->orWhere(function ($chapterQuery) use ($chapterId, $selectedTopicIds) {
                        $chapterQuery->where('chapter_id', $chapterId)
                            ->when(
                                $selectedTopicIds->isNotEmpty(),
                                fn ($topicQuery) => $topicQuery->where(function ($topicScope) use ($selectedTopicIds) {
                                    $topicScope->whereIn('topic_id', $selectedTopicIds)
                                        ->orWhereNull('topic_id');
                                })
                            );
                    });
                }
            })
            ->when(! empty($data['sources']), fn ($query) => $query->whereIn('source', $data['sources']))
            ->when(! empty($data['difficulties']), fn ($query) => $query->whereIn('difficulty', $data['difficulties']))
            ->whereHas('questionType', fn ($query) => $query->where('is_objective', true))
            ->with(['questionType:id,name,schema_key,is_objective', 'options', 'chapter:id,name', 'topic:id,name'])
            ->orderBy('chapter_id')
            ->orderBy('topic_id')
            ->orderBy('id')
            ->get()
            ->filter(fn (Question $question) => OnlineTestQuestionMapper::supports($question))
            ->map(fn (Question $question) => [
                'id' => $question->id,
                'prompt' => trim((string) ($question->statement_en ?: $question->statement_ur ?: 'Question')),
                'chapter_name' => $question->chapter?->name,
                'topic_name' => $question->topic?->name,
                'question_type_id' => $question->question_type_id,
                'question_type' => $question->questionType?->name,
                'question_type_key' => $question->questionType?->schema_key,
                'option_count' => $question->options->count(),
                'source' => $question->source,
                'source_label' => Question::sourceLabel($question->source),
                'difficulty' => $question->difficulty,
            ])
            ->values();

        return response()->json(['questions' => $questions]);
    }

    private function catalogProps(): array
    {
        $access = AppUserAccess::resolve(auth()->user());
        $patternIds = $access['ids']['pattern_access'];
        $classIds = $access['ids']['class_access'];
        $subjectIds = $access['ids']['subject_access'];

        return [
            'patterns' => Pattern::query()
                ->where('status', 1)
                ->when($patternIds !== null, fn ($query) => $query->whereIn('id', $patternIds))
                ->orderBy('name')
                ->get(['id', 'name', 'short_name']),
            'patternClasses' => DB::table('pattern_classes')
                ->join('classes', 'classes.id', '=', 'pattern_classes.class_id')
                ->where('classes.status', 1)
                ->when($patternIds !== null, fn ($query) => $query->whereIn('pattern_classes.pattern_id', $patternIds))
                ->when($classIds !== null, fn ($query) => $query->whereIn('pattern_classes.class_id', $classIds))
                ->orderBy('classes.name')
                ->select('pattern_classes.pattern_id', 'classes.id', 'classes.name')
                ->get()
                ->filter(fn ($row) => AppUserAccess::allowsClass($access, (int) $row->pattern_id, (int) $row->id))
                ->values(),
            'classSubjects' => ClassSubject::query()
                ->join('subjects', 'subjects.id', '=', 'class_subjects.subject_id')
                ->where('subjects.status', 1)
                ->when($patternIds !== null, fn ($query) => $query->whereIn('class_subjects.pattern_id', $patternIds))
                ->when($classIds !== null, fn ($query) => $query->whereIn('class_subjects.class_id', $classIds))
                ->when($subjectIds !== null, fn ($query) => $query->whereIn('class_subjects.subject_id', $subjectIds))
                ->orderBy('subjects.name_eng')
                ->select(
                    'class_subjects.class_id',
                    'class_subjects.pattern_id',
                    'class_subjects.subject_id',
                    'subjects.name_eng as name'
                )
                ->get()
                ->filter(fn ($row) => AppUserAccess::allowsSubject(
                    $access,
                    (int) $row->pattern_id,
                    (int) $row->class_id,
                    (int) $row->subject_id,
                ))
                ->values(),
            'sourceOptions' => collect(Question::sourceOptions())
                ->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label])
                ->values(),
            'difficultyOptions' => collect(Question::difficultyValues())
                ->map(fn (string $value) => ['value' => $value, 'label' => ucfirst($value)])
                ->values(),
        ];
    }

    private function validatePayload(Request $request): array
    {
        $validator = Validator::make($request->all(), [
            'title' => ['required', 'string', 'max:255'],
            'instructions' => ['nullable', 'string', 'max:5000'],
            'duration_minutes' => ['required', 'integer', 'min:1', 'max:300'],
            'timing_mode' => ['sometimes', Rule::in(['whole_test', 'per_question', 'none'])],
            'question_time_seconds' => ['nullable', 'integer', 'min:10', 'max:3600'],
            'auto_advance' => ['sometimes', 'boolean'],
            'allow_back_navigation' => ['sometimes', 'boolean'],
            'allow_skip' => ['sometimes', 'boolean'],
            'shuffle_questions' => ['sometimes', 'boolean'],
            'shuffle_options' => ['sometimes', 'boolean'],
            'focus_loss_action' => ['sometimes', Rule::in(['allow', 'warn', 'submit'])],
            'require_fullscreen' => ['sometimes', 'boolean'],
            'show_result' => ['sometimes', 'boolean'],
            'show_correct_answers' => ['sometimes', 'boolean'],
            'passing_percentage' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'available_from' => ['nullable', 'date'],
            'available_until' => ['nullable', 'date', 'after:available_from'],
            'pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'chapter_ids' => ['required', 'array', 'min:1'],
            'chapter_ids.*' => ['integer', 'exists:chapters,id'],
            'question_ids' => ['required', 'array', 'min:1'],
            'question_ids.*' => ['integer', 'exists:questions,id'],
        ]);

        $validator->after(function ($validator) use ($request) {
            $chapterIds = collect($request->input('chapter_ids', []))->map(fn ($id) => (int) $id)->unique()->values();
            $questionIds = collect($request->input('question_ids', []))->map(fn ($id) => (int) $id)->unique()->values();

            if ($chapterIds->isEmpty() || $questionIds->isEmpty()) {
                return;
            }

            $allowedQuestionIds = Question::query()
                ->whereIn('id', $questionIds)
                ->whereIn('chapter_id', $chapterIds)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values();

            if ($allowedQuestionIds->count() !== $questionIds->count()) {
                $validator->errors()->add('question_ids', 'Selected questions must belong to the chosen chapters.');
            }

            if ($request->input('timing_mode', 'whole_test') === 'per_question'
                && ! $request->filled('question_time_seconds')) {
                $validator->errors()->add('question_time_seconds', 'Set the time allowed for each question.');
            }
        });

        return array_merge([
            'timing_mode' => 'whole_test',
            'question_time_seconds' => null,
            'auto_advance' => false,
            'allow_back_navigation' => false,
            'allow_skip' => false,
            'shuffle_questions' => false,
            'shuffle_options' => false,
            'focus_loss_action' => 'allow',
            'require_fullscreen' => false,
            'show_result' => true,
            'show_correct_answers' => false,
            'passing_percentage' => 40,
            'available_from' => null,
            'available_until' => null,
        ], $validator->validate());
    }

    private function selectedQuestions(array $validated)
    {
        $questionIds = collect($validated['question_ids'])->map(fn ($id) => (int) $id)->unique()->values();

        $questions = Question::query()
            ->whereIn('id', $questionIds)
            ->whereIn('chapter_id', $validated['chapter_ids'])
            ->with(['questionType:id,name,schema_key,is_objective', 'options', 'chapter:id,name', 'topic:id,name'])
            ->get()
            ->sortBy(fn (Question $question) => $questionIds->search($question->id))
            ->values();

        $snapshots = OnlineTestQuestionMapper::normalizeQuestionSelection($questions);

        if ($questionIds->count() === 0 || count($snapshots) !== $questionIds->count()) {
            abort(422, 'Only supported single-answer objective questions can be used in online tests.');
        }

        return $questions;
    }

    private function syncDraftQuestions(OnlineTest $onlineTest, $questions): void
    {
        $onlineTest->questions()->delete();
        $onlineTest->questions()->createMany(
            OnlineTestQuestionMapper::normalizeQuestionSelection($questions)
        );
    }

    private function authorizeTest(OnlineTest $onlineTest): void
    {
        $user = auth()->user();
        $schoolOwner = $user->schoolOwner();

        abort_unless($schoolOwner && (int) $onlineTest->school_id === (int) $schoolOwner->id, 404);

        if ($user->isTeacher()) {
            abort_unless((int) $onlineTest->created_by === (int) $user->id, 404);
        }
    }

    private function authorizeDraftTest(OnlineTest $onlineTest): void
    {
        $this->authorizeTest($onlineTest);
        abort_unless($onlineTest->status === 'draft', 422);
    }

    private function ensureSubjectAccess(array $data): void
    {
        $access = AppUserAccess::resolve(auth()->user());

        abort_unless(
            AppUserAccess::allowsSubject(
                $access,
                (int) $data['pattern_id'],
                (int) $data['class_id'],
                (int) $data['subject_id'],
            ),
            403,
        );
    }

    private function ensureChapterScope($chapterIds, array $scope): void
    {
        $validCount = Chapter::query()
            ->whereIn('id', $chapterIds)
            ->where('pattern_id', $scope['pattern_id'])
            ->where('class_id', $scope['class_id'])
            ->where('subject_id', $scope['subject_id'])
            ->where('status', 1)
            ->count();

        abort_unless($validCount === $chapterIds->count(), 422);
    }

    private function deliverySettings(array $validated): array
    {
        $perQuestion = $validated['timing_mode'] === 'per_question';

        return [
            'timing_mode' => $validated['timing_mode'],
            'question_time_seconds' => $perQuestion ? $validated['question_time_seconds'] : null,
            'auto_advance' => (bool) $validated['auto_advance'],
            'allow_back_navigation' => $perQuestion ? false : (bool) $validated['allow_back_navigation'],
            'allow_skip' => $perQuestion ? false : (bool) $validated['allow_skip'],
            'shuffle_questions' => (bool) $validated['shuffle_questions'],
            'shuffle_options' => (bool) $validated['shuffle_options'],
            'focus_loss_action' => $validated['focus_loss_action'],
            'require_fullscreen' => (bool) $validated['require_fullscreen'],
            'show_result' => (bool) $validated['show_result'],
            'show_correct_answers' => (bool) $validated['show_result'] && (bool) $validated['show_correct_answers'],
            'passing_percentage' => (int) $validated['passing_percentage'],
            'available_from' => $validated['available_from'],
            'available_until' => $validated['available_until'],
        ];
    }
}
