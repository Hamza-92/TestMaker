<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\OnlineTestAttempt;
use Inertia\Inertia;

class OnlineTestAttemptController extends Controller
{
    public function show(OnlineTestAttempt $attempt)
    {
        $attempt->load([
            'onlineTest.subject:id,name_eng',
            'onlineTest.creator:id,name',
            'answers.onlineTestQuestion',
        ]);

        $test = $attempt->onlineTest;
        abort_if($test === null, 404);

        $user = auth()->user();
        $schoolOwner = $user->schoolOwner();

        abort_unless($schoolOwner && (int) $test->school_id === (int) $schoolOwner->id, 404);

        if ($user->isTeacher()) {
            abort_unless((int) $test->created_by === (int) $user->id, 404);
        }

        $answersByQuestion = $attempt->answers->keyBy('online_test_question_id');
        $questions = $test->questions()
            ->orderBy('sort_order')
            ->get()
            ->map(function ($question) use ($answersByQuestion) {
                $answer = $answersByQuestion->get($question->id);

                return [
                    'id' => $question->id,
                    'prompt_en' => data_get($question->payload, 'prompt_en'),
                    'prompt_ur' => data_get($question->payload, 'prompt_ur'),
                    'options' => collect(data_get($question->payload, 'options', []))
                        ->map(fn (array $option) => [
                            ...$option,
                            'is_selected' => (string) ($answer?->selected_option_key ?? '') === (string) ($option['key'] ?? ''),
                            'is_correct' => (string) ($question->correct_option_key ?? '') === (string) ($option['key'] ?? ''),
                        ])
                        ->values(),
                    'selected_option_key' => $answer?->selected_option_key,
                    'is_correct' => $answer?->is_correct,
                ];
            })
            ->values();

        return Inertia::render('customer/online-tests/attempt-show', [
            'attempt' => [
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
            ],
            'test' => [
                'id' => $test->id,
                'title' => $test->title,
                'subject_name' => $test->subject?->name_eng,
                'creator_name' => $test->creator?->name,
                'focus_loss_action' => $test->focus_loss_action,
            ],
            'questions' => $questions,
        ]);
    }
}
