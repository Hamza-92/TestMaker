<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\PaperTemplate;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionTypeOrGroup;
use App\Support\AppUserAccess;
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
        $access = AppUserAccess::resolve(auth()->user());
        $patternIds = $access['ids']['pattern_access'];
        $classIds = $access['ids']['class_access'];
        $subjectIds = $access['ids']['subject_access'];

        $patterns = Pattern::where('status', 1)
            ->when($patternIds !== null, fn ($q) => $q->whereIn('id', $patternIds))
            ->orderBy('name')
            ->get(['id', 'name']);

        $patternClasses = DB::table('pattern_classes')
            ->join('classes', 'classes.id', '=', 'pattern_classes.class_id')
            ->where('classes.status', 1)
            ->when($patternIds !== null, fn ($q) => $q->whereIn('pattern_classes.pattern_id', $patternIds))
            ->when($classIds !== null, fn ($q) => $q->whereIn('pattern_classes.class_id', $classIds))
            ->orderBy('classes.name')
            ->select('pattern_classes.pattern_id', 'classes.id', 'classes.name')
            ->get()
            ->filter(fn ($row) => AppUserAccess::allowsClass($access, (int) $row->pattern_id, (int) $row->id))
            ->values();

        $classSubjects = ClassSubject::join('subjects', 'subjects.id', '=', 'class_subjects.subject_id')
            ->leftJoin('mediums', 'mediums.id', '=', 'class_subjects.medium_id')
            ->where('subjects.status', 1)
            ->when($patternIds !== null, fn ($q) => $q->whereIn('class_subjects.pattern_id', $patternIds))
            ->when($classIds !== null, fn ($q) => $q->whereIn('class_subjects.class_id', $classIds))
            ->when($subjectIds !== null, fn ($q) => $q->whereIn('class_subjects.subject_id', $subjectIds))
            ->orderBy('subjects.name_eng')
            ->select(
                'class_subjects.class_id',
                'class_subjects.pattern_id',
                'class_subjects.subject_id',
                'subjects.name_eng as name',
                'subjects.name_ur',
                'mediums.name as medium',
            )
            ->get()
            ->filter(fn ($row) => AppUserAccess::allowsSubject(
                $access,
                (int) $row->pattern_id,
                (int) $row->class_id,
                (int) $row->subject_id,
            ))
            ->values();

        return [
            'patterns' => $patterns,
            'patternClasses' => $patternClasses,
            'classSubjects' => $classSubjects,
            'sourceOptions' => collect(Question::sourceOptions())
                ->map(fn (string $label, string $value) => [
                    'value' => $value,
                    'label' => $label,
                ])
                ->values(),
            'difficultyOptions' => collect(Question::difficultyValues())
                ->map(fn (string $value) => [
                    'value' => $value,
                    'label' => ucfirst($value),
                ])
                ->values(),
        ];
    }

    public function index(Request $request)
    {
        $props = self::pageData();

        $templateId = (int) $request->query('template', 0);
        if ($templateId > 0) {
            $template = PaperTemplate::where('user_id', auth()->id())->find($templateId);
            if ($template !== null) {
                $props['appliedTemplate'] = [
                    'id' => $template->id,
                    'name' => $template->name,
                    'settings' => $template->settings,
                    'structure' => $template->structure,
                ];
            }
        }

        $requestedPatternId = (int) $request->query('pattern', 0);
        $props['initialPatternId'] = $props['patterns']->contains('id', $requestedPatternId)
            ? $requestedPatternId
            : null;

        return Inertia::render('customer/papers/generate', $props);
    }

    /**
     * Return chapters (with their topics) for the given pattern + class + subject.
     * Used by the Generate Paper page once the three smart selects are filled.
     */
    public function chapters(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pattern_id' => 'required|integer|exists:patterns,id',
            'class_id' => 'required|integer|exists:classes,id',
            'subject_id' => 'required|integer|exists:subjects,id',
        ]);

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

        $displayMedium = $this->subjectMedium(
            (int) $data['pattern_id'],
            (int) $data['class_id'],
            (int) $data['subject_id'],
        );

        $chapters = Chapter::query()
            ->where('pattern_id', $data['pattern_id'])
            ->where('class_id', $data['class_id'])
            ->where('subject_id', $data['subject_id'])
            ->where('status', 1)
            ->withCount(['questions as question_count' => fn ($q) => $q->where('status', 1)])
            ->with(['topics' => function ($q) {
                $q->where('status', 1)
                    ->orderBy('sort_id')
                    ->orderBy('id')
                    ->select('id', 'chapter_id', 'name', 'name_ur')
                    ->withCount(['questions as question_count' => fn ($qq) => $qq->where('status', 1)]);
            }])
            ->orderBy('group_name')
            ->orderBy('group_heading')
            ->orderBy('chapter_number')
            ->orderBy('sort_id')
            ->orderBy('id')
            ->get(['id', 'name', 'name_ur', 'chapter_number', 'group_name', 'group_heading'])
            ->map(fn (Chapter $c) => [
                'id' => $c->id,
                'name' => $this->localizedLabel($c->name, $c->name_ur, $displayMedium),
                'name_eng' => $c->name,
                'name_ur' => $c->name_ur,
                'chapter_number' => $c->chapter_number,
                'group_name' => $c->group_name,
                'group_heading' => $c->group_heading,
                'question_count' => (int) ($c->question_count ?? 0),
                'topics' => $c->topics->map(fn ($t) => [
                    'id' => $t->id,
                    'name' => $this->localizedLabel($t->name, $t->name_ur, $displayMedium),
                    'name_eng' => $t->name,
                    'name_ur' => $t->name_ur,
                    'question_count' => (int) ($t->question_count ?? 0),
                ])->values(),
            ])
            ->values();

        return response()->json([
            'chapters' => $chapters,
            'medium' => $displayMedium,
        ]);
    }

    public function questionTypes(Request $request): JsonResponse
    {
        [$chapterIds, $validTopicIds, $sources, $difficulties, $requestedMedium, $scope] = $this->questionScope($request);
        $displayMedium = $requestedMedium ?? $this->subjectMediumForChapters($chapterIds);

        if ($sources->isEmpty()) {
            return response()->json(['sections' => [], 'pairings' => []]);
        }

        $rows = $this->scopedQuestionsQuery($chapterIds, $validTopicIds, $sources, $difficulties)
            ->join('question_types', 'question_types.id', '=', 'questions.question_type_id')
            ->leftJoin('question_type_orders as question_type_orders', function ($join) use ($scope): void {
                $join->on('question_type_orders.question_type_id', '=', 'question_types.id')
                    ->where('question_type_orders.pattern_id', $scope->pattern_id)
                    ->where('question_type_orders.class_id', $scope->class_id)
                    ->where('question_type_orders.subject_id', $scope->subject_id);
            })
            ->where('question_types.status', 1)
            ->groupBy('question_types.id', 'question_types.name', 'question_types.name_ur', 'question_types.heading_en', 'question_types.heading_ur', 'question_types.is_objective', 'question_types.options_only', 'question_types.column_per_row', 'question_type_orders.sort_order')
            ->orderByDesc('question_types.is_objective')
            ->orderByRaw('question_type_orders.sort_order IS NULL')
            ->orderBy('question_type_orders.sort_order')
            ->orderBy('question_types.id')
            ->select([
                'question_types.id',
                'question_types.name',
                'question_types.name_ur',
                'question_types.heading_en',
                'question_types.heading_ur',
                'question_types.is_objective',
                'question_types.options_only',
                'question_types.column_per_row',
                DB::raw('question_type_orders.sort_order as sort_order'),
                DB::raw('COUNT(questions.id) as available_count'),
            ])
            ->get()
            ->values();

        $sections = $rows->map(fn ($row, int $index) => [
            'id' => 'sec_'.str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT),
            'questionTypeId' => (int) $row->id,
            'category' => (bool) $row->is_objective ? 'Objective Questions' : 'Subjective Questions',
            'sortOrder' => $row->sort_order === null ? null : (int) $row->sort_order,
            'title' => $this->localizedLabel(
                $this->visibleQuestionTypeLabel($row->name),
                $this->visibleQuestionTypeLabel($row->name_ur),
                $displayMedium,
            ),
            'titleEnglish' => $this->visibleQuestionTypeLabel($row->name),
            'titleUrdu' => $this->visibleQuestionTypeLabel($row->name_ur),
            'heading' => $this->localizedLabel(
                $this->visibleQuestionTypeLabel($row->heading_en),
                $this->visibleQuestionTypeLabel($row->heading_ur),
                $displayMedium,
            ) ?: $this->localizedLabel(
                $this->visibleQuestionTypeLabel($row->name),
                $this->visibleQuestionTypeLabel($row->name_ur),
                $displayMedium,
            ),
            'headingEnglish' => $this->visibleQuestionTypeLabel($row->heading_en ?: $row->name),
            'headingUrdu' => $this->visibleQuestionTypeLabel($row->heading_ur ?: $row->name_ur),
            'availableCount' => (int) $row->available_count,
            'columnPerRow' => max(1, min(5, (int) ($row->column_per_row ?: 1))),
        ]);

        $availableSubjectiveTypeIds = $rows
            ->filter(fn ($row) => ! (bool) $row->is_objective)
            ->pluck('id')
            ->map(fn ($id) => (int) $id);

        $groups = QuestionTypeOrGroup::query()
            ->with('members')
            ->where('pattern_id', (int) $scope->pattern_id)
            ->where('class_id', (int) $scope->class_id)
            ->where('subject_id', (int) $scope->subject_id)
            ->where('is_active', true)
            ->orderBy('id')
            ->get()
            ->filter(fn (QuestionTypeOrGroup $group) => $group->members->isNotEmpty()
                && $group->members->every(
                    fn ($member) => $availableSubjectiveTypeIds->contains($member->question_type_id),
                ))
            ->map(fn (QuestionTypeOrGroup $group) => [
                'id' => $group->id,
                'questionTypeIds' => $group->members
                    ->sortBy('sort_order')
                    ->pluck('question_type_id')
                    ->map(fn ($id) => (int) $id)
                    ->values()
                    ->all(),
            ])
            ->values();

        return response()->json([
            'sections' => $sections,
            'groups' => $groups,
        ]);
    }

    public function questions(Request $request): JsonResponse
    {
        [$chapterIds, $validTopicIds, $sources, $difficulties, $requestedMedium] = $this->questionScope($request);
        $data = $request->validate([
            'question_type_id' => ['required', 'integer', 'exists:question_types,id'],
        ]);

        if ($sources->isEmpty()) {
            return response()->json(['questions' => []]);
        }

        $displayMedium = $requestedMedium ?? $this->subjectMediumForChapters($chapterIds);
        $questions = $this->scopedQuestionsQuery($chapterIds, $validTopicIds, $sources, $difficulties)
            ->where('questions.question_type_id', $data['question_type_id'])
            ->with([
                'questionType',
                'chapter:id,name,name_ur,chapter_number',
                'topic:id,name,name_ur',
                'options',
            ])
            ->orderBy('questions.chapter_id')
            ->orderBy('questions.topic_id')
            ->orderBy('questions.id')
            ->get()
            ->map(function (Question $question) use ($displayMedium) {
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

                $summaryEn = $this->localizedQuestionSummary($question, $content, 'en');
                $summaryUr = $this->localizedQuestionSummary($question, $content, 'ur');

                return [
                    'id' => $question->id,
                    'summaryText' => $this->localizedLabel(
                        $summaryEn,
                        $summaryUr,
                        $displayMedium,
                        QuestionTypeSchemaRegistry::summarize(
                            $question->questionType,
                            $content,
                        ),
                    ),
                    'summaryTextEn' => $summaryEn,
                    'summaryTextUr' => $summaryUr,
                    'medium' => $displayMedium,
                    'schemaKey' => $schema['key'],
                    'isObjective' => (bool) $question->questionType->is_objective,
                    'optionsOnly' => (bool) $question->questionType->options_only,
                    'content' => $content,
                    'source' => $question->source,
                    'sourceLabel' => Question::sourceLabel($question->source),
                    'difficulty' => $question->difficulty,
                    'chapter' => [
                        'id' => $question->chapter->id,
                        'name' => $this->localizedLabel(
                            $question->chapter->name,
                            $question->chapter->name_ur,
                            $displayMedium,
                        ),
                        'nameEng' => $question->chapter->name,
                        'nameUr' => $question->chapter->name_ur,
                        'chapterNumber' => $question->chapter->chapter_number,
                    ],
                    'topic' => $question->topic
                        ? [
                            'id' => $question->topic->id,
                            'name' => $this->localizedLabel(
                                $question->topic->name,
                                $question->topic->name_ur,
                                $displayMedium,
                            ),
                            'nameEng' => $question->topic->name,
                            'nameUr' => $question->topic->name_ur,
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
            'difficulties' => ['array'],
            'difficulties.*' => ['string', Rule::in(Question::difficultyValues())],
            'medium' => ['nullable', Rule::in(['English', 'Urdu', 'Both'])],
        ]);

        $chapterIds = collect($data['chapter_ids'])->map(fn ($id) => (int) $id)->unique()->values();

        $access = AppUserAccess::resolve(auth()->user());
        $allowedChapters = DB::table('chapters')
            ->whereIn('id', $chapterIds)
            ->get(['id', 'pattern_id', 'class_id', 'subject_id'])
            ->filter(fn ($row) => AppUserAccess::allowsSubject(
                $access,
                (int) $row->pattern_id,
                (int) $row->class_id,
                (int) $row->subject_id,
            ))
            ->values();
        $allowedChapterIds = $allowedChapters->pluck('id')->map(fn ($id) => (int) $id);

        abort_if($allowedChapterIds->count() !== $chapterIds->count(), 403);

        $scopeKeys = $allowedChapters
            ->map(fn ($row) => "{$row->pattern_id}:{$row->class_id}:{$row->subject_id}")
            ->unique()
            ->values();
        abort_unless($scopeKeys->count() === 1, 422, 'Select chapters from one pattern, class, and subject.');
        $scope = $allowedChapters->first();

        $topicIds = collect($data['topic_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();
        $sources = collect($data['sources'] ?? [])
            ->filter(fn ($source) => in_array($source, Question::sourceValues(), true))
            ->values();
        $difficulties = collect($data['difficulties'] ?? [])
            ->filter(fn ($value) => in_array($value, Question::difficultyValues(), true))
            ->values();
        $requestedMedium = $data['medium'] ?? null;
        $validTopicIds = $topicIds->isEmpty()
            ? collect()
            : DB::table('topics')
                ->whereIn('id', $topicIds)
                ->whereIn('chapter_id', $chapterIds)
                ->pluck('id');

        return [$chapterIds, $validTopicIds, $sources, $difficulties, $requestedMedium, $scope];
    }

    private function subjectMedium(int $patternId, int $classId, int $subjectId): string
    {
        $assigned = ClassSubject::query()
            ->leftJoin('mediums', 'mediums.id', '=', 'class_subjects.medium_id')
            ->where('class_subjects.pattern_id', $patternId)
            ->where('class_subjects.class_id', $classId)
            ->where('class_subjects.subject_id', $subjectId)
            ->value('mediums.name');

        if (in_array($assigned, ['English', 'Urdu', 'Both'], true)) {
            return $assigned;
        }

        $questionScope = Question::query()
            ->whereHas('chapter', fn ($query) => $query
                ->where('pattern_id', $patternId)
                ->where('class_id', $classId)
                ->where('subject_id', $subjectId));

        $hasEnglish = (clone $questionScope)
            ->where(function ($query): void {
                $query->whereNotNull('statement_en')
                    ->orWhereNotNull('description_en')
                    ->orWhereNotNull('answer_en')
                    ->orWhereHas('options', fn ($optionQuery) => $optionQuery->whereNotNull('text_en'));
            })
            ->exists();
        $hasUrdu = (clone $questionScope)
            ->where(function ($query): void {
                $query->whereNotNull('statement_ur')
                    ->orWhereNotNull('description_ur')
                    ->orWhereNotNull('answer_ur')
                    ->orWhereHas('options', fn ($optionQuery) => $optionQuery->whereNotNull('text_ur'));
            })
            ->exists();

        if (! $hasEnglish && ! $hasUrdu) {
            $chapterScope = Chapter::query()
                ->where('pattern_id', $patternId)
                ->where('class_id', $classId)
                ->where('subject_id', $subjectId);
            $hasEnglish = (clone $chapterScope)->whereNotNull('name')->exists();
            $hasUrdu = (clone $chapterScope)->whereNotNull('name_ur')->exists();
        }

        return $hasEnglish && $hasUrdu
            ? 'Both'
            : ($hasUrdu ? 'Urdu' : 'English');
    }

    private function subjectMediumForChapters($chapterIds): string
    {
        $scope = Chapter::query()
            ->whereIn('id', $chapterIds)
            ->first(['pattern_id', 'class_id', 'subject_id']);

        return $scope
            ? $this->subjectMedium(
                (int) $scope->pattern_id,
                (int) $scope->class_id,
                (int) $scope->subject_id,
            )
            : 'Both';
    }

    private function localizedQuestionSummary(
        Question $question,
        array $content,
        string $locale,
    ): ?string {
        if ((bool) $question->questionType->options_only) {
            return null;
        }

        foreach ([
            "statement_{$locale}",
            "description_{$locale}",
            "answer_{$locale}",
        ] as $attribute) {
            $value = trim((string) $question->{$attribute});
            if ($value !== '') {
                return $value;
            }
        }

        return $this->firstLocalizedContentValue($content, "_{$locale}");
    }

    private function firstLocalizedContentValue(array $content, string $suffix): ?string
    {
        foreach ($content as $key => $value) {
            if (is_string($key) && str_ends_with($key, $suffix) && ! is_array($value)) {
                $normalized = trim((string) $value);
                if ($normalized !== '') {
                    return $normalized;
                }
            }
        }

        foreach ($content as $value) {
            if (is_array($value)) {
                $localized = $this->firstLocalizedContentValue($value, $suffix);
                if ($localized !== null) {
                    return $localized;
                }
            }
        }

        return null;
    }

    private function visibleQuestionTypeLabel(mixed $value): string
    {
        $label = trim((string) $value);
        $schemaKeys = array_map(
            'strtolower',
            array_keys(QuestionTypeSchemaRegistry::definitions()),
        );

        return in_array(strtolower($label), $schemaKeys, true) ? '' : $label;
    }

    private function localizedLabel(
        mixed $english,
        mixed $urdu,
        string $medium,
        string $fallback = '',
    ): string {
        $english = trim((string) $english);
        $urdu = trim((string) $urdu);

        if ($medium === 'English') {
            return $english !== '' ? $english : ($urdu !== '' ? $urdu : $fallback);
        }

        if ($medium === 'Urdu') {
            return $urdu !== '' ? $urdu : ($english !== '' ? $english : $fallback);
        }

        if ($english !== '' && $urdu !== '' && $english !== $urdu) {
            return "{$english} / {$urdu}";
        }

        return $english !== '' ? $english : ($urdu !== '' ? $urdu : $fallback);
    }

    private function scopedQuestionsQuery($chapterIds, $validTopicIds, $sources, $difficulties = null)
    {
        $query = Question::query()
            ->whereIn('questions.chapter_id', $chapterIds)
            ->where('questions.status', 1)
            ->whereIn('questions.source', $sources)
            ->when($validTopicIds->isNotEmpty(), function ($query) use ($validTopicIds) {
                $query->where(function ($query) use ($validTopicIds) {
                    $query->whereIn('questions.topic_id', $validTopicIds)
                        ->orWhereNull('questions.topic_id');
                });
            });

        if ($difficulties !== null && $difficulties->isNotEmpty()) {
            $query->whereIn('questions.difficulty', $difficulties);
        }

        return $query;
    }
}
