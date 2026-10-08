<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Superadmin\QuestionBulkImportRequest;
use App\Http\Requests\Superadmin\QuestionUpsertRequest;
use App\Models\AuditLog;
use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Medium;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\QuestionType;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Topic;
use App\Support\Questions\QuestionBulkImporter;
use App\Support\Questions\QuestionTypeChanger;
use App\Support\Questions\QuestionTypeHeadingResolver;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class QuestionController extends Controller
{
    public function index()
    {
        return $this->renderQuestionsIndex(null, null);
    }

    public function uploadImage(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('questions.create') || $request->user()?->can('questions.edit'), 403);
        $validated = $request->validate([
            'file' => ['required', 'image', 'mimes:jpeg,png,webp,gif', 'max:2048'],
        ]);
        $id = (string) Str::uuid();
        DB::table('question_images')->insert([
            'id' => $id,
            'mime_type' => $validated['file']->getMimeType(),
            'data' => base64_encode($validated['file']->get()),
            'created_at' => now(),
        ]);

        return response()->json(['location' => route('question-images.show', $id, false)]);
    }

    public function formChapters(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('questions.create') || $request->user()?->can('questions.edit'), 403);

        return response()->json(['chapters' => $this->chapterFormOptions(includeInactive: true)]);
    }

    public function bulkUpdateType(Request $request, QuestionTypeChanger $changer): RedirectResponse
    {
        $validated = $request->validate([
            'question_ids' => ['required', 'array', 'min:1'],
            'question_ids.*' => ['required', 'integer', 'distinct', 'exists:questions,id'],
            'question_type_id' => ['required', 'integer', 'exists:question_types,id'],
        ]);
        $targetType = QuestionType::query()
            ->where('status', 1)
            ->findOrFail($validated['question_type_id']);
        $changed = $changer->change(
            Question::query()->whereKey($validated['question_ids']),
            $targetType,
            'question_type_id',
        );

        return back()->with(
            'success',
            $changed === 1
                ? '1 question type changed.'
                : "{$changed} question types changed.",
        );
    }

    public function reorder(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'chapter_id' => ['required', 'integer', 'exists:chapters,id'],
            'topic_id' => ['nullable', 'integer', 'exists:topics,id'],
            'question_type_id' => ['required', 'integer', 'exists:question_types,id'],
            'order' => ['required', 'array', 'min:1'],
            'order.*' => ['required', 'integer', 'distinct'],
        ]);

        if (isset($validated['topic_id'])) {
            abort_unless(
                Topic::query()
                    ->whereKey($validated['topic_id'])
                    ->where('chapter_id', $validated['chapter_id'])
                    ->exists(),
                422,
                'The selected topic does not belong to this chapter.',
            );
        }

        $scope = Question::query()
            ->where('chapter_id', $validated['chapter_id'])
            ->where('question_type_id', $validated['question_type_id'])
            ->when(
                isset($validated['topic_id']),
                fn ($query) => $query->where('topic_id', $validated['topic_id']),
                fn ($query) => $query->whereNull('topic_id'),
            );
        $questionIds = (clone $scope)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values();
        $submittedIds = collect($validated['order'])
            ->map(fn ($id) => (int) $id)
            ->values();

        abort_unless(
            $submittedIds->count() === $questionIds->count()
                && $submittedIds->diff($questionIds)->isEmpty(),
            422,
            'The question order is out of date. Please refresh and try again.',
        );

        DB::transaction(function () use ($scope, $submittedIds): void {
            foreach ($submittedIds as $index => $questionId) {
                (clone $scope)
                    ->whereKey($questionId)
                    ->update(['sort_order' => $index + 1]);
            }
        });

        return back()->with('success', 'Question order saved.');
    }

    public function chapterFilter(Chapter $chapter)
    {
        return redirect($this->browseHrefForChapter($chapter, null));
    }

    public function topicFilter(Chapter $chapter, Topic $topic)
    {
        abort_if((int) $topic->chapter_id !== (int) $chapter->id, 404);

        return redirect($this->browseHrefForChapter($chapter, $topic->id));
    }

    private function renderQuestionsIndex(?int $chapterId, ?int $topicId)
    {
        return Inertia::render('superadmin/questions', [
            'patterns' => fn () => Pattern::query()->ordered()->get(['id', 'name', 'short_name']),
            'initialChapter' => fn () => $chapterId
                ? $this->questionFilterChapter(Chapter::query()->findOrFail($chapterId))
                : null,
            'filters' => ['chapter_id' => $chapterId, 'topic_id' => $topicId],
        ]);
    }

    public function filterOptions(Request $request): JsonResponse
    {
        $scope = $request->validate([
            'level' => ['required', 'in:classes,subjects,chapters,topics'],
            'pattern_id' => ['required_if:level,classes,subjects,chapters', 'integer', 'min:1'],
            'class_id' => ['required_if:level,subjects,chapters', 'integer', 'min:1'],
            'subject_id' => ['required_if:level,chapters', 'integer', 'min:1'],
            'chapter_id' => ['required_if:level,topics', 'integer', 'min:1'],
        ]);

        $options = match ($scope['level']) {
            'classes' => SchoolClass::query()
                ->where(function ($query) use ($scope) {
                    $query->whereIn('id', DB::table('pattern_classes')->select('class_id')->where('pattern_id', $scope['pattern_id']))
                        // Keep older chapters reachable even if their assignment is missing.
                        ->orWhereIn('id', Chapter::query()->select('class_id')->where('pattern_id', $scope['pattern_id']));
                })
                ->ordered()->get(['id', 'name']),
            'subjects' => Subject::query()
                ->where(function ($query) use ($scope) {
                    $query->whereIn('id', ClassSubject::query()->select('subject_id')->where('pattern_id', $scope['pattern_id'])->where('class_id', $scope['class_id']))
                        ->orWhereIn('id', Chapter::query()->select('subject_id')->where('pattern_id', $scope['pattern_id'])->where('class_id', $scope['class_id']));
                })
                ->orderBy('name_eng')->orderBy('id')->get(['id', 'name_eng', 'name_ur']),
            'chapters' => $this->questionFilterChapters($scope),
            'topics' => Topic::query()->where('chapter_id', $scope['chapter_id'])
                ->orderBy('sort_id')->orderBy('name')->orderBy('id')
                ->get(['id', 'name', 'name_ur', 'status']),
        };

        return response()->json(['options' => $options]);
    }

    public function listTypes(): JsonResponse
    {
        return response()->json(['options' => $this->questionTypeFormOptions(includeInactive: true)]);
    }

    public function listData(Request $request): JsonResponse
    {
        $scope = $request->validate([
            'chapter_id' => ['required', 'integer', 'min:1'],
            'topic_id' => ['nullable', 'integer', 'min:1'],
        ]);
        $chapter = Chapter::query()->findOrFail($scope['chapter_id']);
        $topicId = $scope['topic_id'] ?? null;
        if ($topicId !== null) {
            abort_unless(Topic::query()->whereKey($topicId)->where('chapter_id', $chapter->id)->exists(), 404);
        }

        $questions = Question::query()->where('chapter_id', $chapter->id)
            ->when($topicId, fn ($query) => $query->where('topic_id', $topicId))
            ->with(['questionType', 'topic:id,name,name_ur,chapter_id'])
            ->withCount(['options', 'options as correct_options_count' => fn ($query) => $query->where('is_correct', true)])
            ->orderBy('question_type_id')->orderBy('topic_id')->orderBy('sort_order')->orderBy('id')
            ->get();
        $types = $questions->pluck('questionType')->unique('id')->values();
        $optionsOnlyIds = $questions->filter(fn (Question $question) => $question->questionType->options_only && empty($question->content))->pluck('id');
        $firstOptions = $optionsOnlyIds->isEmpty() ? collect() : QuestionOption::query()
            ->whereIn('question_id', $optionsOnlyIds)->orderBy('sort_order')->orderBy('id')
            ->get(['id', 'question_id', 'text_en', 'text_ur', 'is_correct'])->groupBy('question_id')->map->first();

        return response()->json([
            'chapter' => $this->questionFilterChapter($chapter),
            'questionTypes' => $types->sortBy('name')->values()->map(fn (QuestionType $type) => $this->serializeQuestionType($type)),
            'topics' => $questions->pluck('topic')->filter()->unique('id')->values(),
            'questions' => $questions->map(function (Question $question) use ($firstOptions): array {
                $type = QuestionTypeSchemaRegistry::typeForQuestion($question, $question->questionType);
                $legacy = empty($question->content);
                $question->setRelation('options', collect());
                $content = QuestionTypeSchemaRegistry::contentFromQuestion($question, $type);
                if ($legacy && $type->options_only && $firstOptions->has($question->id)) {
                    $option = $firstOptions->get($question->id);
                    $content['options'] = [['text_en' => $option->text_en, 'text_ur' => $option->text_ur]];
                }
                $metrics = QuestionTypeSchemaRegistry::metrics($type, $content);
                $schemaKey = $this->resolvedQuestionSchema($type)['key'];
                if (! in_array($schemaKey, [
                    QuestionTypeSchemaRegistry::OBJECTIVE_MCQ, QuestionTypeSchemaRegistry::OBJECTIVE_BLANK_CHOICE,
                    QuestionTypeSchemaRegistry::OBJECTIVE_TRUE_FALSE, QuestionTypeSchemaRegistry::OBJECTIVE_PASSAGE_MCQ,
                    QuestionTypeSchemaRegistry::SUBJECTIVE_GROUPED, QuestionTypeSchemaRegistry::SUBJECTIVE_PAIRS,
                    QuestionTypeSchemaRegistry::SUBJECTIVE_SAME_STATEMENT,
                ], true)) {
                    $metrics['options_count'] = $question->options_count;
                }
                if ($legacy) {
                    if (in_array($schemaKey, [QuestionTypeSchemaRegistry::OBJECTIVE_MCQ, QuestionTypeSchemaRegistry::OBJECTIVE_BLANK_CHOICE], true)) {
                        $metrics['options_count'] = $question->options_count;
                        $metrics['correct_options_count'] = $question->correct_options_count;
                    } elseif ($schemaKey === QuestionTypeSchemaRegistry::OBJECTIVE_TRUE_FALSE) {
                        $metrics['correct_options_count'] = $question->correct_options_count > 0 ? 1 : 0;
                    }
                }

                return [
                    'id' => $question->id,
                    'question_type_id' => $question->question_type_id,
                    'topic_id' => $question->topic_id,
                    'summary_text' => QuestionTypeSchemaRegistry::summarize($type, $content),
                    'source' => $question->source,
                    'source_label' => Question::sourceLabel($question->source),
                    'status' => $question->status,
                    'sort_order' => $question->sort_order,
                    'created_at' => $question->created_at?->toISOString(),
                    ...$metrics,
                ];
            }),
        ]);
    }

    private function questionFilterChapters(array $scope): Collection
    {
        $chapters = Chapter::query()->where('pattern_id', $scope['pattern_id'])
            ->where('class_id', $scope['class_id'])->where('subject_id', $scope['subject_id'])
            ->with(['subject', 'schoolClass:id,name', 'pattern:id,name,short_name'])
            ->orderBy('group_name')->orderBy('group_heading')->orderBy('sort_id')->orderBy('chapter_number')->orderBy('name')->orderBy('id')->get();
        $subjectTypes = $this->subjectTypesForChapters($chapters);

        return $chapters->map(fn (Chapter $chapter) => $this->questionFilterChapter($chapter, $subjectTypes->get((string) $chapter->id)));
    }

    private function questionFilterChapter(Chapter $chapter, ?string $subjectType = null): array
    {
        $chapter->loadMissing(['subject', 'schoolClass:id,name', 'pattern:id,name,short_name']);

        return [
            'id' => $chapter->id,
            'name' => $chapter->name,
            'name_ur' => $chapter->name_ur,
            'chapter_number' => $chapter->chapter_number,
            'group_name' => $chapter->group_name,
            'group_heading' => $chapter->group_heading,
            'status' => $chapter->status,
            'subject' => [
                'id' => $chapter->subject->id,
                'name_eng' => $chapter->subject->name_eng,
                'name_ur' => $chapter->subject->name_ur,
                'subject_type' => $subjectType ?? $chapter->effectiveSubjectType(),
                'status' => $chapter->subject->status,
            ],
            'class' => $chapter->schoolClass->only(['id', 'name']),
            'pattern' => $chapter->pattern->only(['id', 'name', 'short_name']),
            'topics' => [],
        ];
    }

    public function chapterIndex(Subject $subject, Chapter $chapter)
    {
        $this->ensureChapterBelongsToSubject($subject, $chapter);

        return redirect($this->browseHrefForChapter($chapter, null));
    }

    public function create()
    {
        return $this->renderCreateForm(null, null);
    }

    public function createForChapterClean(Chapter $chapter)
    {
        return $this->renderCreateForm($chapter->id, null);
    }

    public function createForTopicClean(Chapter $chapter, Topic $topic)
    {
        abort_if((int) $topic->chapter_id !== (int) $chapter->id, 404);

        return $this->renderCreateForm($chapter->id, $topic->id);
    }

    private function renderCreateForm(?int $chapterId, ?int $topicId)
    {
        $backHref = $chapterId
            ? $this->browseHrefForChapter(Chapter::query()->findOrFail($chapterId), $topicId)
            : '/superadmin/questions';

        return Inertia::render('superadmin/questions/add', [
            'questionTypes' => $this->questionTypeFormOptions(),
            'chapters' => $this->chapterFormOptions(includeInactive: true, onlyChapterId: $chapterId),
            'sourceOptions' => $this->sourceOptions(),
            'defaultChapterId' => $chapterId,
            'mediumOptions' => $this->mediumOptions(),
            'defaultTopicId' => $topicId,
            'lockedChapterId' => $chapterId,
            'lockedTopicId' => $topicId,
            'backHref' => $backHref,
        ]);
    }

    public function createForChapter(Request $request, Subject $subject, Chapter $chapter)
    {
        $this->ensureChapterBelongsToSubject($subject, $chapter);

        return Inertia::render('superadmin/questions/add', [
            'questionTypes' => $this->questionTypeFormOptions(),
            'chapters' => $this->chapterFormOptions(includeInactive: true, onlyChapterId: $chapter->id),
            'sourceOptions' => $this->sourceOptions(),
            'defaultChapterId' => $chapter->id,
            'mediumOptions' => $this->mediumOptions(),
            'defaultTopicId' => $request->integer('topic_id') ?: null,
            'lockedChapterId' => $chapter->id,
            'backHref' => $this->browseHrefForChapter($chapter, null),
        ]);
    }

    public function import(Request $request)
    {
        $status = (string) $request->query('status', '1');

        return Inertia::render('superadmin/questions/import', [
            'questionTypes' => $this->questionTypeFormOptions(),
            'chapters' => $this->chapterFormOptions(),
            'sourceOptions' => $this->sourceOptions(),
            'mediumOptions' => $this->mediumOptions(),
            'defaults' => [
                'question_type_id' => (string) $request->query('question_type_id', ''),
                'chapter_id' => (string) $request->query('chapter_id', ''),
                'topic_id' => (string) $request->query('topic_id', ''),
                'source' => (string) $request->query('source', ''),
                'status' => in_array($status, ['0', '1'], true) ? $status : '1',
                'medium_id' => (string) $request->query('medium_id', ''),
            ],
            'lockedChapterId' => null,
            'backHref' => '/superadmin/questions',
            'preview' => $request->session()->get('question_import_preview'),
            'previewToken' => $request->session()->get('question_import_preview_token'),
            'report' => $request->session()->get('question_import_report'),
        ]);
    }

    public function topicIndex(Subject $subject, Chapter $chapter, Topic $topic)
    {
        $this->ensureChapterBelongsToSubject($subject, $chapter);
        abort_if((int) $topic->chapter_id !== (int) $chapter->id, 404);

        return redirect($this->browseHrefForChapter($chapter, $topic->id));
    }

    public function createForTopic(Request $request, Subject $subject, Chapter $chapter, Topic $topic)
    {
        $this->ensureChapterBelongsToSubject($subject, $chapter);
        abort_if((int) $topic->chapter_id !== (int) $chapter->id, 404);

        return Inertia::render('superadmin/questions/add', [
            'questionTypes' => $this->questionTypeFormOptions(),
            'chapters' => $this->chapterFormOptions(includeInactive: true, onlyChapterId: $chapter->id),
            'sourceOptions' => $this->sourceOptions(),
            'defaultChapterId' => $chapter->id,
            'mediumOptions' => $this->mediumOptions(),
            'defaultTopicId' => $topic->id,
            'lockedChapterId' => $chapter->id,
            'lockedTopicId' => $topic->id,
            'backHref' => $this->browseHrefForChapter($chapter, $topic->id),
        ]);
    }

    public function importForChapter(Request $request, Subject $subject, Chapter $chapter)
    {
        $this->ensureChapterBelongsToSubject($subject, $chapter);

        $status = (string) $request->query('status', '1');

        return Inertia::render('superadmin/questions/import', [
            'questionTypes' => $this->questionTypeFormOptions(),
            'chapters' => $this->chapterFormOptions(includeInactive: true, onlyChapterId: $chapter->id),
            'sourceOptions' => $this->sourceOptions(),
            'mediumOptions' => $this->mediumOptions(),
            'defaults' => [
                'question_type_id' => (string) $request->query('question_type_id', ''),
                'chapter_id' => (string) $chapter->id,
                'topic_id' => (string) $request->query('topic_id', ''),
                'source' => (string) $request->query('source', ''),
                'status' => in_array($status, ['0', '1'], true) ? $status : '1',
                'medium_id' => (string) $request->query('medium_id', ''),
            ],
            'lockedChapterId' => $chapter->id,
            'backHref' => $this->browseHrefForChapter($chapter, $request->integer('topic_id') ?: null),
            'preview' => $request->session()->get('question_import_preview'),
            'previewToken' => $request->session()->get('question_import_preview_token'),
            'report' => $request->session()->get('question_import_report'),
        ]);
    }

    public function previewImport(
        QuestionBulkImportRequest $request,
        QuestionBulkImporter $importer,
    ): RedirectResponse {
        $validated = $request->validated();
        [$questionType, $chapter, $topic] = $this->resolveImportContext($validated);
        $existingToken = $validated['preview_token'] ?? null;

        if ($existingToken) {
            $this->forgetImportPreview($request, $existingToken);
        }

        $preview = $importer->preview(
            file: $request->file('file'),
            questionType: $questionType,
            chapter: $chapter,
            topic: $topic,
            defaultSource: $validated['source'] ?? null,
            defaultStatus: $validated['status'],
            mediumId: $validated['medium_id'] ?? null,
        );

        $redirect = $this->importRedirect($request, $validated);

        if ($preview['total_rows'] === 0) {
            return $redirect->with(
                'question_import_preview',
                Arr::except($preview, ['records']),
            );
        }

        $token = (string) Str::uuid();

        $this->storeImportPreview($request, $token, [
            'question_type_id' => $questionType->id,
            'chapter_id' => $chapter->id,
            'topic_id' => $topic?->id,
            'source' => $validated['source'] ?? null,
            'status' => $validated['status'],
            'medium_id' => $validated['medium_id'] ?? null,
            'records' => $preview['records'],
            'rows' => $preview['rows'],
            'total_rows' => $preview['total_rows'],
            'ready_rows' => $preview['ready_rows'],
            'failed_rows' => $preview['failed_rows'],
            'duplicate_rows' => $preview['duplicate_rows'],
        ]);

        return $redirect
            ->with(
                'question_import_preview',
                [
                    ...Arr::except($preview, ['records', 'rows']),
                    'rows' => array_slice($preview['rows'], 0, QuestionBulkImporter::PREVIEW_PAGE_SIZE),
                ],
            )
            ->with('question_import_preview_token', $token);
    }

    public function previewImportRows(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'preview_token' => ['required', 'uuid'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $preview = $this->findImportPreview($request, $validated['preview_token']);
        abort_unless($preview, 404);

        $page = (int) ($validated['page'] ?? 1);

        return response()->json([
            'rows' => array_slice(
                $preview['rows'],
                ($page - 1) * QuestionBulkImporter::PREVIEW_PAGE_SIZE,
                QuestionBulkImporter::PREVIEW_PAGE_SIZE,
            ),
            'page' => $page,
            'page_count' => (int) ceil($preview['total_rows'] / QuestionBulkImporter::PREVIEW_PAGE_SIZE),
        ]);
    }

    public function storeImport(
        QuestionBulkImportRequest $request,
        QuestionBulkImporter $importer,
    ): RedirectResponse {
        $validated = $request->validated();

        return $this->storeImportFromPreview($request, $importer, $validated);
    }

    public function downloadImportTemplate(Request $request, QuestionBulkImporter $importer): StreamedResponse
    {
        $validated = $request->validate([
            'question_type_id' => ['required', 'integer', 'exists:question_types,id'],
            'chapter_id' => ['required', 'integer', 'exists:chapters,id'],
            'format' => ['required', 'in:csv,xlsx'],
        ]);
        $questionType = QuestionType::query()->findOrFail($validated['question_type_id']);
        $chapter = Chapter::query()->findOrFail($validated['chapter_id']);
        $questionType = QuestionTypeHeadingResolver::one(
            $questionType,
            (int) $chapter->pattern_id,
            (int) $chapter->class_id,
            (int) $chapter->subject_id,
        );
        abort_unless(QuestionTypeSchemaRegistry::supportsSimpleImport($questionType), 422);
        $headers = $importer->templateHeaders($questionType);

        if ($validated['format'] === 'csv') {
            return response()->streamDownload(function () use ($headers): void {
                $stream = fopen('php://output', 'w');
                fwrite($stream, "\xEF\xBB\xBF");
                fputcsv($stream, $headers);
                fclose($stream);
            }, 'question-import-template.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
        }

        return response()->streamDownload(function () use ($headers): void {
            $spreadsheet = new Spreadsheet;
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->fromArray($headers, null, 'A1');

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');

            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
        }, 'question-import-template.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function store(QuestionUpsertRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $questionType = QuestionType::query()->findOrFail($validated['question_type_id']);
        $chapter = Chapter::query()
            ->with('subject:id,subject_type')
            ->findOrFail($validated['chapter_id']);
        $saveAndAddNew = $request->boolean('save_and_add_new');

        $question = DB::transaction(function () use ($chapter, $questionType, $validated): Question {
            [$payload, $options] = $this->buildPayload($validated, $questionType, $chapter);
            $payload['created_by'] = auth()->id();

            $question = Question::query()->create($payload);

            if ($options !== []) {
                $question->options()->createMany($options);
            }

            $question->load([
                'questionType:id,name',
                'chapter.subject:id,name_eng',
                'topic:id,name',
            ]);

            AuditLog::record(
                model: $question,
                event: AuditEvent::Created,
                newValues: $this->auditValues($question),
                notes: 'Question created.',
            );

            return $question;
        });

        $topicId = $validated['topic_id'] ?? null;

        if ($saveAndAddNew) {
            $addUrl = $topicId
                ? route('superadmin.questions.chapters.topics.add', [$chapter, $topicId], false)
                : route('superadmin.questions.chapters.add', $chapter, false);

            return redirect($addUrl)->with('success', 'Question created successfully.');
        }

        $listUrl = $this->browseHrefForChapter($chapter, $question->topic_id);

        return redirect($listUrl)->with('success', 'Question created successfully.');
    }

    public function show(Question $question)
    {
        $question->load([
            'questionType.objectiveType:id,name',
            'chapter.subject:id,name_eng,name_ur,subject_type',
            'chapter.schoolClass:id,name',
            'chapter.pattern:id,name,short_name',
            'topic:id,name,name_ur,chapter_id',
            'options',
            'auditLogs.changedBy:id,name',
        ]);

        return Inertia::render('superadmin/questions/show', [
            'question' => $this->transformQuestionDetail($question),
        ]);
    }

    public function edit(Question $question)
    {
        $question->load([
            'questionType:id,name,is_objective,is_single,have_statement,statement_label,have_description,description_label,have_answer,schema_key,objective_type_id,column_per_row,status',
            'chapter.subject:id,name_eng,name_ur,subject_type',
            'topic:id,name,name_ur,chapter_id',
            'options',
        ]);

        $backHref = $this->browseHrefForChapter($question->chapter, $question->topic_id);

        return Inertia::render('superadmin/questions/edit', [
            'question' => [
                'id' => $question->id,
                'question_type_id' => $question->question_type_id,
                'chapter_id' => $question->chapter_id,
                'medium_id' => $question->medium_id,
                'topic_id' => $question->topic_id,
                'source' => $question->source,
                'status' => $question->status,
                'schema_key' => QuestionTypeSchemaRegistry::typeForQuestion(
                    $question,
                    $question->questionType,
                )->schema_key,
                'schema' => $this->resolvedQuestionSchema(
                    QuestionTypeSchemaRegistry::typeForQuestion(
                        $question,
                        $question->questionType,
                    ),
                ),
                'content' => QuestionTypeSchemaRegistry::contentFromQuestion(
                    $question,
                    QuestionTypeSchemaRegistry::typeForQuestion(
                        $question,
                        $question->questionType,
                    ),
                ),
            ],
            'questionTypes' => $this->questionTypeFormOptions(includeInactive: true),
            'chapters' => $this->chapterFormOptions(includeInactive: true, onlyChapterId: $question->chapter_id),
            'chapterOptionsUrl' => route('superadmin.questions.form-chapters', absolute: false),
            'sourceOptions' => $this->sourceOptions(),
            'mediumOptions' => $this->mediumOptions(),
            'backHref' => $backHref,
        ]);
    }

    public function update(QuestionUpsertRequest $request, Question $question): RedirectResponse
    {
        $validated = $request->validated();
        $questionType = QuestionType::query()->findOrFail($validated['question_type_id']);
        $chapter = Chapter::query()
            ->with('subject:id,subject_type')
            ->findOrFail($validated['chapter_id']);

        DB::transaction(function () use ($chapter, $question, $questionType, $validated): void {
            $question->load([
                'questionType:id,name',
                'chapter.subject:id,name_eng',
                'topic:id,name',
                'options',
            ]);

            $oldValues = $this->auditValues($question);
            [$payload, $options] = $this->buildPayload($validated, $questionType, $chapter, $question);

            $question->update($payload);
            $question->options()->delete();

            if ($options !== []) {
                $question->options()->createMany($options);
            }

            $question->load([
                'questionType:id,name',
                'chapter.subject:id,name_eng',
                'topic:id,name',
                'options',
            ]);

            $newValues = $this->auditValues($question);
            $changes = array_filter(
                $newValues,
                fn ($value, $key) => ($oldValues[$key] ?? null) != $value,
                ARRAY_FILTER_USE_BOTH,
            );

            if (! empty($changes)) {
                AuditLog::record(
                    model: $question,
                    event: AuditEvent::Updated,
                    oldValues: array_intersect_key($oldValues, $changes),
                    newValues: $changes,
                    notes: 'Question updated.',
                );
            }
        });

        $topicId = $validated['topic_id'] ?? null;
        $listUrl = $this->browseHrefForChapter($chapter, $topicId);

        return redirect($listUrl)->with('success', 'Question updated successfully.');
    }

    public function destroy(Question $question): RedirectResponse
    {
        $question->load([
            'questionType:id,name',
            'chapter.subject:id,name_eng',
            'topic:id,name',
            'options',
        ]);

        AuditLog::record(
            model: $question,
            event: AuditEvent::Deleted,
            oldValues: $this->auditValues($question),
            notes: 'Question deleted.',
        );

        $question->delete();

        return back()
            ->with('success', 'Question deleted successfully.');
    }

    private function buildPayload(
        array $validated,
        QuestionType $questionType,
        Chapter $chapter,
        ?Question $existingQuestion = null,
    ): array {
        $effectiveType = $existingQuestion !== null && filled($existingQuestion->schema_key)
            ? QuestionTypeSchemaRegistry::typeForQuestion($existingQuestion, $questionType)
            : QuestionTypeHeadingResolver::one(
                $questionType,
                (int) $chapter->pattern_id,
                (int) $chapter->class_id,
                (int) $chapter->subject_id,
            );
        $questionPayload = QuestionTypeSchemaRegistry::buildQuestionPayload(
            $effectiveType,
            $validated['content'] ?? [],
        );

        return [[
            'question_type_id' => $questionType->id,
            'schema_key' => $effectiveType->schema_key,
            'medium_id' => $validated['medium_id'] ?? Medium::query()->where('name', 'Both')->value('id'),
            'chapter_id' => $validated['chapter_id'],
            'topic_id' => $chapter->effectiveSubjectType() === 'topic-wise'
                ? ($validated['topic_id'] ?? null)
                : null,
            'statement_en' => $questionPayload['statement_en'],
            'statement_ur' => $questionPayload['statement_ur'],
            'description_en' => $questionPayload['description_en'],
            'description_ur' => $questionPayload['description_ur'],
            'answer_en' => $questionPayload['answer_en'],
            'answer_ur' => $questionPayload['answer_ur'],
            'content' => $questionPayload['content'],
            'source' => $validated['source'] ?? null,
            'status' => $validated['status'],
        ], $questionPayload['options']];
    }

    private function storeImportFromPreview(
        Request $request,
        QuestionBulkImporter $importer,
        array $validated,
    ): RedirectResponse {
        $preview = $this->findImportPreview($request, $validated['preview_token']);

        if (! is_array($preview)) {
            return $this->importRedirect($request, $validated)
                ->with('question_import_report', [
                    'status' => 'error',
                    'total_rows' => 0,
                    'imported_rows' => 0,
                    'failed_rows' => 0,
                    'errors' => ['Preview expired. Preview the file again.'],
                ]);
        }

        if (
            (int) $validated['question_type_id'] !== (int) $preview['question_type_id']
            || (int) $validated['chapter_id'] !== (int) $preview['chapter_id']
            || (int) ($validated['topic_id'] ?? 0) !== (int) ($preview['topic_id'] ?? 0)
            || ($validated['source'] ?? null) !== ($preview['source'] ?? null)
            || (int) $validated['status'] !== (int) $preview['status']
            || (int) ($validated['medium_id'] ?? 0) !== (int) ($preview['medium_id'] ?? 0)
        ) {
            return $this->importRedirect($request, $validated)
                ->with('question_import_report', [
                    'status' => 'error',
                    'total_rows' => 0,
                    'imported_rows' => 0,
                    'failed_rows' => 0,
                    'errors' => ['Import settings changed. Preview the file again.'],
                ]);
        }

        $selectedRowNumbers = collect($validated['selected_row_numbers'])->map(fn ($number) => (int) $number)->all();
        $validRowNumbers = array_column($preview['records'], 'row_number');

        if (array_diff($selectedRowNumbers, $validRowNumbers) !== []) {
            return $this->importRedirect($request, $validated)
                ->with('question_import_report', [
                    'status' => 'error',
                    'total_rows' => 0,
                    'imported_rows' => 0,
                    'failed_rows' => 0,
                    'errors' => ['Selection is invalid. Preview the file again.'],
                ]);
        }

        $questionType = QuestionType::query()->find($preview['question_type_id'] ?? null);
        $chapter = Chapter::query()
            ->with('subject:id,name_eng,subject_type')
            ->find($preview['chapter_id'] ?? null);
        $topicId = $preview['topic_id'] ?? null;
        $topic = $topicId ? Topic::query()->find($topicId) : null;

        if (! $questionType || ! $chapter || ($topicId && ! $topic)) {
            return $this->importRedirect($request, $validated)
                ->with('question_import_report', [
                    'status' => 'error',
                    'total_rows' => 0,
                    'imported_rows' => 0,
                    'failed_rows' => 0,
                    'errors' => ['Preview is no longer valid. Preview the file again.'],
                ]);
        }

        $questionType = QuestionTypeHeadingResolver::one(
            $questionType,
            (int) $chapter->pattern_id,
            (int) $chapter->class_id,
            (int) $chapter->subject_id,
        );

        $this->forgetImportPreview($request, $validated['preview_token']);
        $selectedRecords = collect($preview['records'])
            ->filter(fn (array $record) => in_array($record['row_number'], $selectedRowNumbers, true))
            ->values()
            ->all();

        $report = $importer->importRecords(
            records: $selectedRecords,
            questionType: $questionType,
            chapter: $chapter,
            topic: $topic,
            creatorId: auth()->id(),
            totalRows: $preview['total_rows'],
            failedRows: $preview['failed_rows'] - $preview['duplicate_rows'],
            unselectedRows: $preview['ready_rows'] - count($selectedRecords),
            previewDuplicateRows: $preview['duplicate_rows'],
        );

        return $this->importRedirect($request, $preview)
            ->with('question_import_report', $report);
    }

    private function resolveImportContext(array $validated): array
    {
        $questionType = QuestionType::query()->findOrFail($validated['question_type_id']);
        $chapter = Chapter::query()
            ->with('subject:id,name_eng,subject_type')
            ->findOrFail($validated['chapter_id']);
        $topic = isset($validated['topic_id'])
            ? Topic::query()->findOrFail($validated['topic_id'])
            : null;

        $questionType = QuestionTypeHeadingResolver::one(
            $questionType,
            (int) $chapter->pattern_id,
            (int) $chapter->class_id,
            (int) $chapter->subject_id,
        );

        return [$questionType, $chapter, $topic];
    }

    private function importRedirectParams(array $values): array
    {
        $topicId = $values['topic_id'] ?? null;

        return [
            'question_type_id' => isset($values['question_type_id'])
                ? (string) $values['question_type_id']
                : '',
            'chapter_id' => isset($values['chapter_id'])
                ? (string) $values['chapter_id']
                : '',
            'topic_id' => $topicId ? (string) $topicId : null,
            'source' => $values['source'] ?? null,
            'status' => (string) ((int) ($values['status'] ?? 1)),
            'medium_id' => isset($values['medium_id']) ? (string) $values['medium_id'] : null,
        ];
    }

    private function importRedirect(Request $request, array $values): RedirectResponse
    {
        if ($request->boolean('chapter_scoped') && isset($values['chapter_id'])) {
            $chapter = Chapter::query()->find($values['chapter_id']);

            if ($chapter) {
                return redirect()->route('superadmin.subjects.chapters.questions.import', [
                    'subject' => $chapter->subject_id,
                    'chapter' => $chapter->id,
                    ...Arr::except($this->importRedirectParams($values), ['chapter_id']),
                ]);
            }
        }

        return redirect()->route('superadmin.questions.import', $this->importRedirectParams($values));
    }

    private function storeImportPreview(Request $request, string $token, array $preview): void
    {
        Cache::put('question-import-preview:'.$token, [
            ...$preview,
            'user_id' => (int) $request->user()->id,
        ], now()->addMinutes(30));
    }

    private function findImportPreview(Request $request, string $token): ?array
    {
        $preview = Cache::get('question-import-preview:'.$token);

        return is_array($preview)
            && ($preview['user_id'] ?? null) === (int) $request->user()->id
                ? $preview
                : null;
    }

    private function forgetImportPreview(Request $request, string $token): void
    {
        if ($this->findImportPreview($request, $token)) {
            Cache::forget('question-import-preview:'.$token);
        }
    }

    private function questionTypeFormOptions(bool $includeInactive = false): Collection
    {
        return QuestionType::query()
            ->with('headingRules:id,question_type_id,pattern_id,class_id,subject_id,schema_key,question_text_rtl,column_per_row')
            ->when(! $includeInactive, fn ($query) => $query->where('status', 1))
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'heading_en',
                'is_objective',
                'options_only',
                'is_single',
                'have_answer',
                'have_description',
                'schema_key',
                'objective_type_id',
                'column_per_row',
                'status',
            ])
            ->map(fn (QuestionType $questionType) => $this->serializeQuestionType($questionType))
            ->values();
    }

    private function sourceOptions(): Collection
    {
        return collect(Question::sourceOptions())
            ->map(fn (string $label, string $value) => [
                'value' => $value,
                'label' => $label,
            ])
            ->values();
    }

    private function mediumOptions(): Collection
    {
        return Medium::query()
            ->orderBy('id')
            ->get(['id', 'name'])
            ->map(fn (Medium $medium) => ['id' => $medium->id, 'name' => $medium->name])
            ->values();
    }

    private function ensureChapterBelongsToSubject(Subject $subject, Chapter $chapter): void
    {
        abort_if((int) $chapter->subject_id !== (int) $subject->id, 404);
    }

    private function browseHrefForChapter(Chapter $chapter, ?int $topicId): string
    {
        $parents = [$chapter->pattern_id, $chapter->class_id, $chapter->subject_id, $chapter->id];
        if ($topicId && $chapter->effectiveSubjectType() === 'topic-wise') {
            return route('superadmin.questions.browse.topic', [...$parents, $topicId], false);
        }

        if ($chapter->effectiveSubjectType() === 'topic-wise'
            && Topic::query()->where('chapter_id', $chapter->id)->exists()) {
            return route('superadmin.questions.browse.unassigned', $parents, false);
        }

        return route('superadmin.questions.browse.chapter', $parents, false);
    }

    private function chapterContext(Chapter $chapter): array
    {
        $chapter->load([
            'subject:id,name_eng,name_ur,subject_type,status',
            'schoolClass:id,name,status',
            'pattern:id,name,short_name,status',
            'topics' => fn ($query) => $query
                ->withCount('questions')
                ->orderBy('sort_id')
                ->orderBy('name')
                ->select('id', 'chapter_id', 'name', 'name_ur', 'status'),
        ]);
        $chapter->loadCount('questions');

        return [
            'id' => $chapter->id,
            'name' => $chapter->name,
            'name_ur' => $chapter->name_ur,
            'chapter_number' => $chapter->chapter_number,
            'group_name' => $chapter->group_name,
            'group_heading' => $chapter->group_heading,
            'status' => $chapter->status,
            'questions_count' => $chapter->questions_count,
            'subject' => [
                'id' => $chapter->subject->id,
                'name_eng' => $chapter->subject->name_eng,
                'name_ur' => $chapter->subject->name_ur,
                'subject_type' => $chapter->effectiveSubjectType(),
                'status' => $chapter->subject->status,
            ],
            'class' => [
                'id' => $chapter->schoolClass->id,
                'name' => $chapter->schoolClass->name,
                'status' => $chapter->schoolClass->status,
            ],
            'pattern' => [
                'id' => $chapter->pattern->id,
                'name' => $chapter->pattern->name,
                'short_name' => $chapter->pattern->short_name,
                'status' => $chapter->pattern->status,
            ],
            'topics' => $chapter->topics
                ->map(fn (Topic $topic) => [
                    'id' => $topic->id,
                    'name' => $topic->name,
                    'name_ur' => $topic->name_ur,
                    'status' => $topic->status,
                    'questions_count' => $topic->questions_count,
                ])
                ->values(),
        ];
    }

    private function chapterFormOptions(bool $includeInactive = false, ?int $onlyChapterId = null): Collection
    {
        $chapters = Chapter::query()
            ->with([
                'subject:id,name_eng,name_ur,subject_type,status',
                'schoolClass:id,name,status',
                'pattern:id,name,short_name,status',
                'topics' => fn ($query) => $query
                    ->when(! $includeInactive, fn ($topicQuery) => $topicQuery->where('status', 1))
                    ->orderBy('sort_id')
                    ->orderBy('name')
                    ->select('id', 'chapter_id', 'name', 'name_ur', 'status'),
            ])
            ->when(! $includeInactive, fn ($query) => $query->where('status', 1))
            ->when($onlyChapterId, fn ($query) => $query->whereKey($onlyChapterId))
            ->orderBy('group_name')
            ->orderBy('group_heading')
            ->orderBy('chapter_number')
            ->orderBy('name')
            ->get([
                'id',
                'subject_id',
                'class_id',
                'pattern_id',
                'name',
                'name_ur',
                'chapter_number',
                'group_name',
                'group_heading',
                'status',
            ])
            ->filter(function (Chapter $chapter) use ($includeInactive) {
                if (! $chapter->subject || ! $chapter->schoolClass || ! $chapter->pattern) {
                    return false;
                }

                if ($includeInactive) {
                    return true;
                }

                return (int) $chapter->subject->status === 1
                    && (int) $chapter->schoolClass->status === 1
                    && (int) $chapter->pattern->status === 1;
            })
            ->values();

        $subjectTypes = $this->subjectTypesForChapters($chapters);

        return $chapters
            ->map(fn (Chapter $chapter) => [
                'id' => $chapter->id,
                'name' => $chapter->name,
                'name_ur' => $chapter->name_ur,
                'chapter_number' => $chapter->chapter_number,
                'group_name' => $chapter->group_name,
                'group_heading' => $chapter->group_heading,
                'status' => $chapter->status,
                'subject' => [
                    'id' => $chapter->subject->id,
                    'name_eng' => $chapter->subject->name_eng,
                    'name_ur' => $chapter->subject->name_ur,
                    'subject_type' => $subjectTypes->get((string) $chapter->id),
                    'status' => $chapter->subject->status,
                ],
                'class' => [
                    'id' => $chapter->schoolClass->id,
                    'name' => $chapter->schoolClass->name,
                ],
                'pattern' => [
                    'id' => $chapter->pattern->id,
                    'name' => $chapter->pattern->name,
                    'short_name' => $chapter->pattern->short_name,
                ],
                'topics' => $chapter->topics
                    ->map(fn ($topic) => [
                        'id' => $topic->id,
                        'name' => $topic->name,
                        'name_ur' => $topic->name_ur,
                        'status' => $topic->status,
                    ])
                    ->values(),
            ])
            ->values();
    }

    private function transformQuestionListItem(
        Question $question,
        ?string $subjectType = null,
        bool $includeContent = false,
    ): array {
        $effectiveType = QuestionTypeSchemaRegistry::typeForQuestion(
            $question,
            $question->questionType,
        );
        $schema = $this->resolvedQuestionSchema($effectiveType);
        $content = QuestionTypeSchemaRegistry::contentFromQuestion(
            $question,
            $effectiveType,
        );
        $metrics = QuestionTypeSchemaRegistry::metrics(
            $effectiveType,
            $content,
            $question->options,
        );

        $item = [
            'id' => $question->id,
            'source' => $question->source,
            'source_label' => Question::sourceLabel($question->source),
            'status' => $question->status,
            'sort_order' => $question->sort_order,
            'created_at' => $question->created_at?->toISOString(),
            'summary_text' => QuestionTypeSchemaRegistry::summarize(
                $effectiveType,
                $content,
            ),
            'question_type' => $this->serializeQuestionType($question->questionType),
            'chapter' => [
                'id' => $question->chapter->id,
                'name' => $question->chapter->name,
                'name_ur' => $question->chapter->name_ur,
                'chapter_number' => $question->chapter->chapter_number,
                'group_name' => $question->chapter->group_name,
                'group_heading' => $question->chapter->group_heading,
                'subject' => [
                    'id' => $question->chapter->subject->id,
                    'name_eng' => $question->chapter->subject->name_eng,
                    'name_ur' => $question->chapter->subject->name_ur,
                    'subject_type' => $subjectType ?? $question->chapter->effectiveSubjectType(),
                ],
                'class' => [
                    'id' => $question->chapter->schoolClass->id,
                    'name' => $question->chapter->schoolClass->name,
                ],
                'pattern' => [
                    'id' => $question->chapter->pattern->id,
                    'name' => $question->chapter->pattern->name,
                    'short_name' => $question->chapter->pattern->short_name,
                ],
            ],
            'topic' => $question->topic
                ? [
                    'id' => $question->topic->id,
                    'name' => $question->topic->name,
                    'name_ur' => $question->topic->name_ur,
                ]
                : null,
            'options_count' => $metrics['options_count'],
            'correct_options_count' => $metrics['correct_options_count'],
            'items_count' => $metrics['items_count'],
        ];

        if ($includeContent) {
            $item['content'] = $content;
            $item['schema'] = $schema;
        }

        return $item;
    }

    /**
     * Resolve scoped subject types for a chapter collection in one query.
     *
     * @param  Collection<int, Chapter>  $chapters
     * @return Collection<string, string>
     */
    private function subjectTypesForChapters(Collection $chapters): Collection
    {
        $chapters = $chapters
            ->filter(fn ($chapter) => $chapter instanceof Chapter)
            ->unique('id')
            ->values();

        if ($chapters->isEmpty()) {
            return collect();
        }

        $missingSubjectIds = $chapters
            ->reject(fn (Chapter $chapter) => $chapter->relationLoaded('subject'))
            ->pluck('subject_id')
            ->unique()
            ->values();
        $missingSubjects = $missingSubjectIds->isEmpty()
            ? collect()
            : Subject::query()
                ->whereIn('id', $missingSubjectIds)
                ->get(['id', 'subject_type'])
                ->keyBy('id');

        $chapters->each(function (Chapter $chapter) use ($missingSubjects): void {
            if (! $chapter->relationLoaded('subject')) {
                $chapter->setRelation('subject', $missingSubjects->get($chapter->subject_id));
            }
        });

        $scopedTypes = ClassSubject::query()
            ->whereIn('pattern_id', $chapters->pluck('pattern_id')->unique()->values())
            ->whereIn('class_id', $chapters->pluck('class_id')->unique()->values())
            ->whereIn('subject_id', $chapters->pluck('subject_id')->unique()->values())
            ->get(['pattern_id', 'class_id', 'subject_id', 'subject_type'])
            ->keyBy(fn (ClassSubject $scope) => implode(':', [
                (int) $scope->pattern_id,
                (int) $scope->class_id,
                (int) $scope->subject_id,
            ]));

        return $chapters->mapWithKeys(function (Chapter $chapter) use ($scopedTypes): array {
            $scopeKey = implode(':', [
                (int) $chapter->pattern_id,
                (int) $chapter->class_id,
                (int) $chapter->subject_id,
            ]);
            $subjectType = $scopedTypes->get($scopeKey)?->subject_type;
            $fallback = $chapter->subject?->subject_type;

            return [(string) $chapter->id => in_array($subjectType, ClassSubject::SUBJECT_TYPES, true)
                ? $subjectType
                : (in_array($fallback, ClassSubject::SUBJECT_TYPES, true) ? $fallback : 'chapter-wise')];
        });
    }

    private function transformQuestionDetail(Question $question): array
    {
        $listItem = $this->transformQuestionListItem($question, includeContent: true);
        $listItem['options'] = $question->options
            ->map(fn (QuestionOption $option) => [
                'id' => $option->id,
                'text_en' => $option->text_en,
                'text_ur' => $option->text_ur,
                'is_correct' => $option->is_correct,
                'sort_order' => $option->sort_order,
            ])
            ->values();
        $listItem['audit_logs'] = $question->auditLogs
            ->map(fn ($log) => [
                'id' => $log->id,
                'event' => $log->event?->value,
                'old_values' => $log->old_values ?? [],
                'new_values' => $log->new_values ?? [],
                'changed_by' => $log->changedBy?->name ?? 'System',
                'created_at' => $log->created_at?->toISOString(),
            ])
            ->values();
        $listItem['updated_at'] = $question->updated_at?->toISOString();

        return $listItem;
    }

    private function auditValues(Question $question): array
    {
        $effectiveType = QuestionTypeSchemaRegistry::typeForQuestion(
            $question,
            $question->questionType,
        );
        $content = QuestionTypeSchemaRegistry::contentFromQuestion(
            $question,
            $effectiveType,
        );

        return [
            'question_type' => $question->questionType?->name,
            'chapter' => $question->chapter?->name,
            'subject' => $question->chapter?->subject?->name_eng,
            'topic' => $question->topic?->name,
            'source' => $question->source,
            'status' => $question->status,
            'schema' => $this->resolvedQuestionSchema($effectiveType)['label'],
            'summary_text' => QuestionTypeSchemaRegistry::summarize(
                $effectiveType,
                $content,
            ),
            'options_count' => QuestionTypeSchemaRegistry::metrics(
                $effectiveType,
                $content,
                $question->options,
            )['options_count'],
        ];
    }

    private function resolvedQuestionSchema(QuestionType $questionType): array
    {
        return QuestionTypeSchemaRegistry::resolve(
            $questionType->schema_key,
            $questionType->is_objective,
            [
                'objective_type_id' => $questionType->objective_type_id,
                'have_description' => $questionType->have_description,
                'have_answer' => $questionType->have_answer,
            ],
        );
    }

    private function serializeQuestionType(QuestionType $questionType): array
    {
        $schema = $this->resolvedQuestionSchema($questionType);

        return [
            'id' => $questionType->id,
            'name' => $questionType->name,
            'heading_en' => $questionType->heading_en,
            'is_objective' => $questionType->is_objective,
            'options_only' => $questionType->options_only,
            'is_single' => $questionType->is_single,
            'have_answer' => $questionType->have_answer,
            'supports_simple_import' => QuestionTypeSchemaRegistry::supportsSimpleImport($questionType),
            'schema_key' => $schema['key'],
            'schema' => $schema,
            'scope_rules' => $questionType->relationLoaded('headingRules')
                ? $questionType->headingRules
                    ->filter(fn ($rule) => filled($rule->schema_key))
                    ->map(fn ($rule) => [
                        'pattern_id' => (int) $rule->pattern_id,
                        'class_id' => $rule->class_id === null ? null : (int) $rule->class_id,
                        'subject_id' => $rule->subject_id === null ? null : (int) $rule->subject_id,
                        'schema_key' => $rule->schema_key,
                        'supports_simple_import' => QuestionTypeSchemaRegistry::supportsSimpleImportSchema($rule->schema_key),
                        'schema' => QuestionTypeSchemaRegistry::resolve(
                            $rule->schema_key,
                            (bool) $questionType->is_objective,
                        ),
                    ])->values()
                : collect(),
            'status' => $questionType->status,
        ];
    }
}
