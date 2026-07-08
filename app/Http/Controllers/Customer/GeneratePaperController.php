<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Pattern;
use App\Models\Question;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class GeneratePaperController extends Controller
{
    public static function pageData(): array
    {
        return [
            'patterns' => Pattern::where('status', 1)
                ->orderBy('name')
                ->get(['id', 'name']),

            'patternClasses' => DB::table('pattern_classes')
                ->join('classes', 'classes.id', '=', 'pattern_classes.class_id')
                ->where('classes.status', 1)
                ->orderBy('classes.name')
                ->select('pattern_classes.pattern_id', 'classes.id', 'classes.name')
                ->get(),

            'classSubjects' => ClassSubject::join('subjects', 'subjects.id', '=', 'class_subjects.subject_id')
                ->where('subjects.status', 1)
                ->orderBy('subjects.name_eng')
                ->select(
                    'class_subjects.class_id',
                    'class_subjects.pattern_id',
                    'class_subjects.subject_id',
                    'subjects.name_eng as name'
                )
                ->get(),

            'sourceOptions' => collect(Question::sourceOptions())
                ->map(fn (string $label, string $value) => [
                    'value' => $value,
                    'label' => $label,
                ])
                ->values(),
        ];
    }

    public function index()
    {
        return Inertia::render('customer/papers/generate', self::pageData());
    }

    /**
     * Return chapters (with their topics) for the given pattern + class + subject.
     * Used by the Generate Paper page once the three smart selects are filled.
     */
    public function chapters(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pattern_id' => 'required|integer|exists:patterns,id',
            'class_id'   => 'required|integer|exists:classes,id',
            'subject_id' => 'required|integer|exists:subjects,id',
        ]);

        $chapters = Chapter::query()
            ->where('pattern_id', $data['pattern_id'])
            ->where('class_id', $data['class_id'])
            ->where('subject_id', $data['subject_id'])
            ->where('status', 1)
            ->with(['topics' => function ($q) {
                $q->where('status', 1)
                    ->orderBy('sort_id')
                    ->orderBy('id')
                    ->select('id', 'chapter_id', 'name');
            }])
            ->orderBy('group_name')
            ->orderBy('group_heading')
            ->orderBy('chapter_number')
            ->orderBy('sort_id')
            ->orderBy('id')
            ->get(['id', 'name', 'chapter_number', 'group_name', 'group_heading'])
            ->map(fn (Chapter $c) => [
                'id'             => $c->id,
                'name'           => $c->name,
                'chapter_number' => $c->chapter_number,
                'group_name'     => $c->group_name,
                'group_heading'  => $c->group_heading,
                'topics'         => $c->topics->map(fn ($t) => [
                    'id'   => $t->id,
                    'name' => $t->name,
                ])->values(),
            ])
            ->values();

        return response()->json(['chapters' => $chapters]);
    }

    public function questionTypes(Request $request): JsonResponse
    {
        [$chapterIds, $validTopicIds, $sources] = $this->questionScope($request);

        if ($sources->isEmpty()) {
            return response()->json(['sections' => []]);
        }

        $rows = $this->scopedQuestionsQuery($chapterIds, $validTopicIds, $sources)
            ->join('question_types', 'question_types.id', '=', 'questions.question_type_id')
            ->where('question_types.status', 1)
            ->groupBy('question_types.id', 'question_types.name', 'question_types.is_objective', 'question_types.column_per_row')
            ->orderByDesc('question_types.is_objective')
            ->orderBy('question_types.name')
            ->select([
                'question_types.id',
                'question_types.name',
                'question_types.is_objective',
                'question_types.column_per_row',
                DB::raw('COUNT(questions.id) as available_count'),
            ])
            ->get()
            ->values();

        $sections = $rows->map(fn ($row, int $index) => [
            'id' => 'sec_'.str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT),
            'questionTypeId' => (int) $row->id,
            'category' => (bool) $row->is_objective ? 'Objective Questions' : 'Subjective Questions',
            'title' => $row->name,
            'availableCount' => (int) $row->available_count,
            'columnPerRow' => max(1, min(5, (int) ($row->column_per_row ?: 1))),
        ]);

        return response()->json(['sections' => $sections]);
    }

    public function questions(Request $request): JsonResponse
    {
        [$chapterIds, $validTopicIds, $sources] = $this->questionScope($request);
        $data = $request->validate([
            'question_type_id' => ['required', 'integer', 'exists:question_types,id'],
        ]);

        if ($sources->isEmpty()) {
            return response()->json(['questions' => []]);
        }

        $questions = $this->scopedQuestionsQuery($chapterIds, $validTopicIds, $sources)
            ->where('questions.question_type_id', $data['question_type_id'])
            ->with([
                'questionType',
                'chapter:id,name,chapter_number',
                'topic:id,name',
                'options',
            ])
            ->orderBy('questions.chapter_id')
            ->orderBy('questions.topic_id')
            ->orderBy('questions.id')
            ->get()
            ->map(function (Question $question) {
                $content = QuestionTypeSchemaRegistry::contentFromQuestion(
                    $question,
                    $question->questionType,
                );
                $schema = QuestionTypeSchemaRegistry::resolve(
                    $question->questionType->schema_key,
                    $question->questionType->is_objective,
                    [
                        'objective_type_id' => $question->questionType->objective_type_id,
                        'have_description' => $question->questionType->have_description,
                        'have_answer' => $question->questionType->have_answer,
                    ],
                );

                return [
                    'id' => $question->id,
                    'summaryText' => QuestionTypeSchemaRegistry::summarize(
                        $question->questionType,
                        $content,
                    ),
                    'schemaKey' => $schema['key'],
                    'isObjective' => (bool) $question->questionType->is_objective,
                    'content' => $content,
                    'source' => $question->source,
                    'sourceLabel' => Question::sourceLabel($question->source),
                    'chapter' => [
                        'id' => $question->chapter->id,
                        'name' => $question->chapter->name,
                        'chapterNumber' => $question->chapter->chapter_number,
                    ],
                    'topic' => $question->topic
                        ? [
                            'id' => $question->topic->id,
                            'name' => $question->topic->name,
                        ]
                        : null,
                ];
            })
            ->values();

        return response()->json(['questions' => $questions]);
    }

    private function questionScope(Request $request): array
    {
        $data = $request->validate([
            'chapter_ids' => ['required', 'array', 'min:1'],
            'chapter_ids.*' => ['integer', 'exists:chapters,id'],
            'topic_ids' => ['array'],
            'topic_ids.*' => ['integer', 'exists:topics,id'],
            'sources' => ['array'],
            'sources.*' => ['string', Rule::in(Question::sourceValues())],
        ]);

        $chapterIds = collect($data['chapter_ids'])->map(fn ($id) => (int) $id)->unique()->values();
        $topicIds = collect($data['topic_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();
        $sources = collect($data['sources'] ?? [])
            ->filter(fn ($source) => in_array($source, Question::sourceValues(), true))
            ->values();
        $validTopicIds = $topicIds->isEmpty()
            ? collect()
            : DB::table('topics')
                ->whereIn('id', $topicIds)
                ->whereIn('chapter_id', $chapterIds)
                ->pluck('id');

        return [$chapterIds, $validTopicIds, $sources];
    }

    private function scopedQuestionsQuery($chapterIds, $validTopicIds, $sources)
    {
        return Question::query()
            ->whereIn('questions.chapter_id', $chapterIds)
            ->where('questions.status', 1)
            ->whereIn('questions.source', $sources)
            ->when($validTopicIds->isNotEmpty(), function ($query) use ($validTopicIds) {
                $query->where(function ($query) use ($validTopicIds) {
                    $query->whereIn('questions.topic_id', $validTopicIds)
                        ->orWhereNull('questions.topic_id');
                });
            });
    }
}
