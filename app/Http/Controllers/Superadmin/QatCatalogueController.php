<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Pattern;
use App\Models\Question;
use App\Support\Qat\QatCatalogueTransfer;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class QatCatalogueController extends Controller
{
    public function transfer(): Response
    {
        $sources = Pattern::query()->where('status', 1)->ordered()
            ->get(['id', 'name'])->map(fn (Pattern $pattern) => [
                'id' => $pattern->id,
                'name' => $pattern->name,
                'classes' => ClassSubject::query()
                    ->join('classes', 'classes.id', '=', 'class_subjects.class_id')
                    ->join('subjects', 'subjects.id', '=', 'class_subjects.subject_id')
                    ->where('class_subjects.pattern_id', $pattern->id)
                    ->where('classes.status', 1)->where('subjects.status', 1)
                    ->orderBy('classes.sort_order')->orderBy('subjects.name_eng')
                    ->get(['classes.id as class_id', 'classes.name as class_name', 'subjects.id as subject_id', 'subjects.name_eng as subject_name']),
            ]);

        return Inertia::render('superadmin/qat-transfer', [
            'sources' => $sources,
            'report' => session('qat_transfer_report'),
        ]);
    }

    public function chapters(Request $request): JsonResponse
    {
        $data = $request->validate([
            'source_pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
        ]);

        $chapters = Chapter::query()
            ->where('pattern_id', $data['source_pattern_id'])
            ->where('class_id', $data['class_id'])
            ->where('subject_id', $data['subject_id'])
            ->orderBy('sort_id')->orderBy('id')
            ->get(['id', 'name', 'chapter_number', 'status']);
        $questions = Question::query()->with('questionType')
            ->whereIn('chapter_id', $chapters->pluck('id'))
            ->orderBy('sort_order')->orderBy('id')
            ->get(['id', 'chapter_id', 'question_type_id', 'statement_en', 'statement_ur', 'content', 'status'])
            ->groupBy('chapter_id');

        return response()->json($chapters->map(fn (Chapter $chapter) => [
            'id' => $chapter->id,
            'name' => $chapter->name,
            'chapter_number' => $chapter->chapter_number,
            'status' => $chapter->status,
            'questions' => $questions->get($chapter->id, collect())->map(function (Question $question) {
                $statement = $question->statement_en ?: $question->statement_ur;
                if (! $statement && $question->questionType) {
                    $statement = QuestionTypeSchemaRegistry::summarize(
                        $question->questionType, (array) ($question->content ?? [])
                    );
                }

                return [
                    'id' => $question->id,
                    'type' => $question->questionType?->name ?? 'Question',
                    'summary' => Str::limit(trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($statement ?: 'Question #'.$question->id))) ?? ''), 180),
                    'status' => $question->status,
                ];
            })->values(),
        ]));
    }

    public function store(Request $request, QatCatalogueTransfer $transfer): RedirectResponse
    {
        $data = $request->validate([
            'academic_year' => ['required', 'regex:/^20\d{2}-\d{2}$/'],
            'month' => ['required', 'integer', 'between:1,12'],
            'source_pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'chapter_ids' => ['required', 'array', 'min:1'],
            'chapter_ids.*' => ['required', 'integer', 'distinct', 'exists:chapters,id'],
            'question_ids' => ['sometimes', 'array'],
            'question_ids.*' => ['required', 'integer', 'distinct', 'exists:questions,id'],
        ]);

        $report = $transfer->copy($data);

        return back()->with('qat_transfer_report', $report);
    }
}
