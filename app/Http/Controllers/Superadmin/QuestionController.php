<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Superadmin\QuestionBulkImportRequest;
use App\Http\Requests\Superadmin\QuestionUpsertRequest;
use App\Models\AuditLog;
use App\Models\Chapter;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\QuestionType;
use App\Models\Subject;
use App\Models\Topic;
use App\Support\Questions\QuestionBulkImporter;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
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
        $questions = Question::query()
            ->with([
                'questionType.objectiveType:id,name',
                'chapter.subject:id,name_eng,name_ur,subject_type',
                'chapter.schoolClass:id,name',
                'chapter.pattern:id,name,short_name',
                'topic:id,name,name_ur,chapter_id',
                'options',
            ])
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('superadmin/questions', [
            'questions' => $questions
                ->map(fn (Question $question) => $this->transformQuestionListItem($question))
                ->values(),
            'questionTypes' => $this->questionTypeFormOptions(includeInactive: true),
            'chapters' => $this->chapterFormOptions(includeInactive: true),
        ]);
    }

    public function chapterIndex(Subject $subject, Chapter $chapter)
    {
        $this->ensureChapterBelongsToSubject($subject, $chapter);

        $questions = Question::query()
            ->where('chapter_id', $chapter->id)
            ->with([
                'questionType.objectiveType:id,name',
                'chapter.subject:id,name_eng,name_ur,subject_type',
                'chapter.schoolClass:id,name',
                'chapter.pattern:id,name,short_name',
                'topic:id,name,name_ur,chapter_id',
                'options',
            ])
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('superadmin/questions/chapter', [
            'chapter' => $this->chapterContext($chapter),
            'questions' => $questions
                ->map(fn (Question $question) => $this->transformQuestionListItem($question))
                ->values(),
            'questionTypes' => $this->questionTypeFormOptions(includeInactive: true),
            'sourceOptions' => $this->sourceOptions(),
        ]);
    }

    public function create(Request $request)
    {
        return Inertia::render('superadmin/questions/add', [
            'questionTypes' => $this->questionTypeFormOptions(),
            'chapters' => $this->chapterFormOptions(),
            'sourceOptions' => $this->sourceOptions(),
            'defaultChapterId' => $request->integer('chapter_id') ?: null,
            'defaultTopicId' => $request->integer('topic_id') ?: null,
            'lockedChapterId' => null,
            'backHref' => '/superadmin/questions',
        ]);
    }

    public function createForChapter(Request $request, Subject $subject, Chapter $chapter)
    {
        $this->ensureChapterBelongsToSubject($subject, $chapter);

        return Inertia::render('superadmin/questions/add', [
            'questionTypes' => $this->questionTypeFormOptions(),
            'chapters' => $this->chapterFormOptions(includeInactive: true),
            'sourceOptions' => $this->sourceOptions(),
            'defaultChapterId' => $chapter->id,
            'defaultTopicId' => $request->integer('topic_id') ?: null,
            'lockedChapterId' => $chapter->id,
            'backHref' => route('superadmin.subjects.chapters.questions', [$subject, $chapter], false),
        ]);
    }

    public function import(Request $request)
    {
        $status = (string) $request->query('status', '1');

        return Inertia::render('superadmin/questions/import', [
            'questionTypes' => $this->questionTypeFormOptions(),
            'chapters' => $this->chapterFormOptions(),
            'sourceOptions' => $this->sourceOptions(),
            'defaults' => [
                'question_type_id' => (string) $request->query('question_type_id', ''),
                'chapter_id' => (string) $request->query('chapter_id', ''),
                'topic_id' => (string) $request->query('topic_id', ''),
                'source' => (string) $request->query('source', ''),
                'status' => in_array($status, ['0', '1'], true) ? $status : '1',
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

        $questions = Question::query()
            ->where('chapter_id', $chapter->id)
            ->where('topic_id', $topic->id)
            ->with([
                'questionType.objectiveType:id,name',
                'chapter.subject:id,name_eng,name_ur,subject_type',
                'chapter.schoolClass:id,name',
                'chapter.pattern:id,name,short_name',
                'topic:id,name,name_ur,chapter_id',
                'options',
            ])
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('superadmin/questions/chapter', [
            'chapter'      => $this->chapterContext($chapter),
            'scopedTopic'  => [
                'id'      => $topic->id,
                'name'    => $topic->name,
                'name_ur' => $topic->name_ur,
            ],
            'questions'     => $questions
                ->map(fn (Question $question) => $this->transformQuestionListItem($question))
                ->values(),
            'questionTypes' => $this->questionTypeFormOptions(includeInactive: true),
            'sourceOptions' => $this->sourceOptions(),
        ]);
    }

    public function createForTopic(Request $request, Subject $subject, Chapter $chapter, Topic $topic)
    {
        $this->ensureChapterBelongsToSubject($subject, $chapter);
        abort_if((int) $topic->chapter_id !== (int) $chapter->id, 404);

        return Inertia::render('superadmin/questions/add', [
            'questionTypes'  => $this->questionTypeFormOptions(),
            'chapters'       => $this->chapterFormOptions(includeInactive: true),
            'sourceOptions'  => $this->sourceOptions(),
            'defaultChapterId' => $chapter->id,
            'defaultTopicId'   => $topic->id,
            'lockedChapterId'  => $chapter->id,
            'lockedTopicId'    => $topic->id,
            'backHref' => route('superadmin.subjects.chapters.topics.questions', [$subject, $chapter, $topic], false),
        ]);
    }

    public function importForChapter(Request $request, Subject $subject, Chapter $chapter)
    {
        $this->ensureChapterBelongsToSubject($subject, $chapter);

        $status = (string) $request->query('status', '1');

        return Inertia::render('superadmin/questions/import', [
            'questionTypes' => $this->questionTypeFormOptions(),
            'chapters' => $this->chapterFormOptions(includeInactive: true),
            'sourceOptions' => $this->sourceOptions(),
            'defaults' => [
                'question_type_id' => (string) $request->query('question_type_id', ''),
                'chapter_id' => (string) $chapter->id,
                'topic_id' => (string) $request->query('topic_id', ''),
                'source' => (string) $request->query('source', ''),
                'status' => in_array($status, ['0', '1'], true) ? $status : '1',
            ],
            'lockedChapterId' => $chapter->id,
            'backHref' => route('superadmin.subjects.chapters.questions', [$subject, $chapter], false),
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
        );

        $redirect = $this->importRedirect($request, $validated);

        if ($preview['status'] !== 'success') {
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
            'records' => $preview['records'],
        ]);

        return $redirect
            ->with(
                'question_import_preview',
                Arr::except($preview, ['records']),
            )
            ->with('question_import_preview_token', $token);
    }

    public function storeImport(
        QuestionBulkImportRequest $request,
        QuestionBulkImporter $importer,
    ): RedirectResponse {
        $validated = $request->validated();

        if ($validated['preview_token'] ?? null) {
            return $this->storeImportFromPreview($request, $importer, $validated);
        }

        [$questionType, $chapter, $topic] = $this->resolveImportContext($validated);

        $report = $importer->import(
            file: $request->file('file'),
            questionType: $questionType,
            chapter: $chapter,
            topic: $topic,
            defaultSource: $validated['source'] ?? null,
            defaultStatus: $validated['status'],
            creatorId: auth()->id(),
        );

        return $this->importRedirect($request, $validated)
            ->with('question_import_report', $report);
    }

    public function downloadImportTemplate(QuestionBulkImporter $importer): StreamedResponse
    {
        $headers = $importer->templateHeaders();

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

        if ($saveAndAddNew) {
            if ($request->boolean('topic_scoped')) {
                $topicId = $validated['topic_id'] ?? null;
                $topic   = $topicId ? Topic::query()->find($topicId) : null;
                if ($topic) {
                    return redirect()
                        ->route('superadmin.subjects.chapters.topics.questions.add', [
                            'subject' => $chapter->subject_id,
                            'chapter' => $chapter->id,
                            'topic'   => $topic->id,
                        ])
                        ->with('success', 'Question created successfully.');
                }
            }

            if ($request->boolean('chapter_scoped')) {
                return redirect()
                    ->route('superadmin.subjects.chapters.questions.add', [
                        'subject' => $chapter->subject_id,
                        'chapter' => $chapter->id,
                    ])
                    ->with('success', 'Question created successfully.');
            }

            return redirect()
                ->route('superadmin.questions.add', ['chapter_id' => $chapter->id])
                ->with('success', 'Question created successfully.');
        }

        return redirect()->route('superadmin.questions.show', $question)
            ->with('success', 'Question created successfully.');
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

        return Inertia::render('superadmin/questions/edit', [
            'question' => [
                'id' => $question->id,
                'question_type_id' => $question->question_type_id,
                'chapter_id' => $question->chapter_id,
                'topic_id' => $question->topic_id,
                'source' => $question->source,
                'status' => $question->status,
                'content' => QuestionTypeSchemaRegistry::contentFromQuestion(
                    $question,
                    $question->questionType,
                ),
            ],
            'questionTypes' => $this->questionTypeFormOptions(includeInactive: true),
            'chapters' => $this->chapterFormOptions(includeInactive: true),
            'sourceOptions' => $this->sourceOptions(),
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
            [$payload, $options] = $this->buildPayload($validated, $questionType, $chapter);

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

        return redirect()->route('superadmin.questions.show', $question)
            ->with('success', 'Question updated successfully.');
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

    private function buildPayload(array $validated, QuestionType $questionType, Chapter $chapter): array
    {
        $questionPayload = QuestionTypeSchemaRegistry::buildQuestionPayload(
            $questionType,
            $validated['content'] ?? [],
        );

        return [[
            'question_type_id' => $questionType->id,
            'chapter_id' => $validated['chapter_id'],
            'topic_id' => $chapter->subject?->subject_type === 'topic-wise'
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
        $preview = $this->pullImportPreview($request, $validated['preview_token']);

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

        $report = $importer->importRecords(
            records: $preview['records'] ?? [],
            questionType: $questionType,
            chapter: $chapter,
            topic: $topic,
            creatorId: auth()->id(),
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
        $previews = $request->session()->get('question_import_previews', []);
        $previews[$token] = $preview;

        $request->session()->put('question_import_previews', $previews);
    }

    private function pullImportPreview(Request $request, string $token): ?array
    {
        $previews = $request->session()->get('question_import_previews', []);
        $preview = $previews[$token] ?? null;

        unset($previews[$token]);
        $request->session()->put('question_import_previews', $previews);

        return is_array($preview) ? $preview : null;
    }

    private function forgetImportPreview(Request $request, string $token): void
    {
        $previews = $request->session()->get('question_import_previews', []);

        if (! array_key_exists($token, $previews)) {
            return;
        }

        unset($previews[$token]);
        $request->session()->put('question_import_previews', $previews);
    }

    private function questionTypeFormOptions(bool $includeInactive = false): Collection
    {
        return QuestionType::query()
            ->when(! $includeInactive, fn ($query) => $query->where('status', 1))
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'heading_en',
                'is_objective',
                'is_single',
                'have_answer',
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

    private function ensureChapterBelongsToSubject(Subject $subject, Chapter $chapter): void
    {
        abort_if((int) $chapter->subject_id !== (int) $subject->id, 404);
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
            'status' => $chapter->status,
            'questions_count' => $chapter->questions_count,
            'subject' => [
                'id' => $chapter->subject->id,
                'name_eng' => $chapter->subject->name_eng,
                'name_ur' => $chapter->subject->name_ur,
                'subject_type' => $chapter->subject->subject_type,
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

    private function chapterFormOptions(bool $includeInactive = false): Collection
    {
        return Chapter::query()
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
            ->orderBy('name')
            ->get([
                'id',
                'subject_id',
                'class_id',
                'pattern_id',
                'name',
                'name_ur',
                'chapter_number',
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
            ->map(fn (Chapter $chapter) => [
                'id' => $chapter->id,
                'name' => $chapter->name,
                'name_ur' => $chapter->name_ur,
                'chapter_number' => $chapter->chapter_number,
                'status' => $chapter->status,
                'subject' => [
                    'id' => $chapter->subject->id,
                    'name_eng' => $chapter->subject->name_eng,
                    'name_ur' => $chapter->subject->name_ur,
                    'subject_type' => $chapter->subject->subject_type,
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

    private function transformQuestionListItem(Question $question): array
    {
        $schema = $this->resolvedQuestionSchema($question->questionType);
        $content = QuestionTypeSchemaRegistry::contentFromQuestion(
            $question,
            $question->questionType,
        );
        $metrics = QuestionTypeSchemaRegistry::metrics(
            $question->questionType,
            $content,
            $question->options,
        );

        return [
            'id' => $question->id,
            'source' => $question->source,
            'source_label' => Question::sourceLabel($question->source),
            'status' => $question->status,
            'created_at' => $question->created_at?->toISOString(),
            'summary_text' => QuestionTypeSchemaRegistry::summarize(
                $question->questionType,
                $content,
            ),
            'content' => $content,
            'question_type' => $this->serializeQuestionType($question->questionType),
            'schema' => $schema,
            'chapter' => [
                'id' => $question->chapter->id,
                'name' => $question->chapter->name,
                'name_ur' => $question->chapter->name_ur,
                'chapter_number' => $question->chapter->chapter_number,
                'subject' => [
                    'id' => $question->chapter->subject->id,
                    'name_eng' => $question->chapter->subject->name_eng,
                    'name_ur' => $question->chapter->subject->name_ur,
                    'subject_type' => $question->chapter->subject->subject_type,
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
    }

    private function transformQuestionDetail(Question $question): array
    {
        $listItem = $this->transformQuestionListItem($question);
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
        $content = QuestionTypeSchemaRegistry::contentFromQuestion(
            $question,
            $question->questionType,
        );

        return [
            'question_type' => $question->questionType?->name,
            'chapter' => $question->chapter?->name,
            'subject' => $question->chapter?->subject?->name_eng,
            'topic' => $question->topic?->name,
            'source' => $question->source,
            'status' => $question->status,
            'schema' => $this->resolvedQuestionSchema($question->questionType)['label'],
            'summary_text' => QuestionTypeSchemaRegistry::summarize(
                $question->questionType,
                $content,
            ),
            'options_count' => QuestionTypeSchemaRegistry::metrics(
                $question->questionType,
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
            'is_single' => $questionType->is_single,
            'have_answer' => $questionType->have_answer,
            'supports_simple_import' => QuestionTypeSchemaRegistry::supportsSimpleImport($questionType),
            'schema_key' => $schema['key'],
            'schema' => $schema,
            'status' => $questionType->status,
        ];
    }
}
