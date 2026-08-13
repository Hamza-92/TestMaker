<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Superadmin\QuestionTypeUpsertRequest;
use App\Models\AuditLog;
use App\Models\Pattern;
use App\Models\QuestionType;
use App\Models\QuestionTypeOrder;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class QuestionTypeController extends Controller
{
    public function index(Request $request)
    {
        return $this->renderIndex('all', $request);
    }

    public function objectiveIndex(Request $request)
    {
        return $this->renderIndex('objective', $request);
    }

    public function subjectiveIndex(Request $request)
    {
        return $this->renderIndex('subjective', $request);
    }

    private function renderIndex(string $initialKind, Request $request)
    {
        $questionTypesQuery = QuestionType::with('objectiveType:id,name')
            ->withCount(['questions', 'objectiveChildren']);

        if (in_array($initialKind, ['objective', 'subjective'], true)) {
            $questionTypesQuery->orderBy('id');
        } else {
            $questionTypesQuery->orderByDesc('created_at');
        }

        $questionTypes = $questionTypesQuery->get([
            'id',
            'name',
            'name_ur',
            'heading_en',
            'heading_ur',
            'description_en',
            'description_ur',
            'have_exercise',
            'have_statement',
            'have_description',
            'have_answer',
            'is_single',
            'is_objective',
            'options_only',
            'schema_key',
            'objective_type_id',
            'column_per_row',
            'status',
            'created_at',
        ]);

        return Inertia::render('superadmin/question-types', [
            'questionTypes' => $questionTypes
                ->map(fn (QuestionType $questionType) => $this->transformQuestionType($questionType))
                ->values(),
            'initialKind' => $initialKind,
            'orderCatalog' => $this->orderCatalog(),
            'scopedQuestionTypes' => $this->scopedQuestionTypes($initialKind, $request),
            'scopedOrderIds' => $this->scopedOrderIds($initialKind, $request),
        ]);
    }

    public function reorder(Request $request, string $kind)
    {
        abort_unless(in_array($kind, ['objective', 'subjective'], true), 404);

        $validated = $request->validate([
            'pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'order' => ['required', 'array'],
            'order.*' => ['required', 'integer', 'distinct'],
        ]);

        $scopeExists = DB::table('pattern_classes')
            ->where('pattern_id', $validated['pattern_id'])
            ->where('class_id', $validated['class_id'])
            ->exists()
            && DB::table('class_subjects')
                ->where('pattern_id', $validated['pattern_id'])
                ->where('class_id', $validated['class_id'])
                ->where('subject_id', $validated['subject_id'])
                ->exists();

        abort_unless($scopeExists, 422, 'The selected pattern, class, and subject are not linked.');

        $questionTypeIds = $this->scopedQuestionTypeQuery(
            $kind,
            (int) $validated['pattern_id'],
            (int) $validated['class_id'],
            (int) $validated['subject_id'],
        )
            ->orderBy('id')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values();
        $submittedIds = collect($validated['order'])->map(fn ($id) => (int) $id)->values();

        abort_unless(
            $submittedIds->count() === $questionTypeIds->count()
                && $submittedIds->diff($questionTypeIds)->isEmpty(),
            422,
            'The question type order is out of date. Please refresh and try again.',
        );

        DB::transaction(function () use ($validated, $submittedIds, $questionTypeIds): void {
            QuestionTypeOrder::query()
                ->where('pattern_id', $validated['pattern_id'])
                ->where('class_id', $validated['class_id'])
                ->where('subject_id', $validated['subject_id'])
                ->whereIn('question_type_id', $questionTypeIds)
                ->delete();

            foreach ($submittedIds as $index => $questionTypeId) {
                QuestionTypeOrder::create([
                    'pattern_id' => $validated['pattern_id'],
                    'class_id' => $validated['class_id'],
                    'subject_id' => $validated['subject_id'],
                    'question_type_id' => $questionTypeId,
                    'sort_order' => $index + 1,
                ]);
            }
        });

        return back()->with('success', ucfirst($kind).' question type order saved for the selected subject.');
    }

    public function show(QuestionType $questionType)
    {
        return $this->renderShow($questionType, '/superadmin/question-types');
    }

    public function showFromObjective(QuestionType $questionType)
    {
        return $this->renderShow($questionType, '/superadmin/question-types/objective');
    }

    public function showFromSubjective(QuestionType $questionType)
    {
        return $this->renderShow($questionType, '/superadmin/question-types/subjective');
    }

    private function renderShow(QuestionType $questionType, string $backHref)
    {
        $questionType->load([
            'objectiveType:id,name,heading_en',
            'auditLogs.changedBy:id,name',
        ])->loadCount(['questions', 'objectiveChildren']);

        return Inertia::render('superadmin/question-types/show', [
            'questionType' => [
                ...$this->transformQuestionType($questionType),
                'audit_logs' => $questionType->auditLogs->map(fn ($log) => [
                    'id' => $log->id,
                    'event' => $log->event?->value,
                    'old_values' => $log->old_values ?? [],
                    'new_values' => $log->new_values ?? [],
                    'changed_by' => $log->changedBy?->name ?? 'System',
                    'created_at' => $log->created_at?->toISOString(),
                ])->values(),
            ],
            'backHref' => $backHref,
        ]);
    }

    public function create()
    {
        return Inertia::render('superadmin/question-types/add', [
            'questionSchemas' => QuestionTypeSchemaRegistry::options(),
        ]);
    }

    public function createObjective()
    {
        return Inertia::render('superadmin/question-types/add', [
            'questionSchemas' => QuestionTypeSchemaRegistry::options(),
            'lockedKind' => 'objective',
        ]);
    }

    public function createSubjective()
    {
        return Inertia::render('superadmin/question-types/add', [
            'questionSchemas' => QuestionTypeSchemaRegistry::options(),
            'lockedKind' => 'subjective',
        ]);
    }

    public function store(QuestionTypeUpsertRequest $request)
    {
        $payload = $this->buildPayload($request->validated(), auth()->id());

        $questionType = QuestionType::create($payload);
        $questionType->load('objectiveType:id,name');

        AuditLog::record(
            model: $questionType,
            event: AuditEvent::Created,
            newValues: $this->auditValues($questionType),
            notes: 'Question type created.',
        );

        return redirect()->route('superadmin.question-types')
            ->with('success', 'Question type created successfully.');
    }

    public function edit(QuestionType $questionType)
    {
        return $this->renderEdit($questionType, '/superadmin/question-types');
    }

    public function editFromObjective(QuestionType $questionType)
    {
        return $this->renderEdit($questionType, '/superadmin/question-types/objective');
    }

    public function editFromSubjective(QuestionType $questionType)
    {
        return $this->renderEdit($questionType, '/superadmin/question-types/subjective');
    }

    private function renderEdit(QuestionType $questionType, string $scope)
    {
        return Inertia::render('superadmin/question-types/edit', [
            'questionType' => [
                'id' => $questionType->id,
                'name' => $questionType->name,
                'name_ur' => $questionType->name_ur,
                'heading_en' => $questionType->heading_en,
                'heading_ur' => $questionType->heading_ur,
                'description_en' => $questionType->description_en,
                'description_ur' => $questionType->description_ur,
                'have_answer' => $questionType->have_answer,
                'is_single' => $questionType->is_single,
                'is_objective' => $questionType->is_objective,
            'options_only' => $questionType->options_only,
                'schema_key' => QuestionTypeSchemaRegistry::resolve(
                    $questionType->schema_key,
                    $questionType->is_objective,
                    [
                        'objective_type_id' => $questionType->objective_type_id,
                        'have_description' => $questionType->have_description,
                        'have_answer' => $questionType->have_answer,
                    ],
                )['key'],
                'status' => $questionType->status,
            ],
            'questionSchemas' => QuestionTypeSchemaRegistry::options(),
            'backHref' => "{$scope}/{$questionType->id}",
        ]);
    }

    public function update(QuestionTypeUpsertRequest $request, QuestionType $questionType)
    {
        $payload = $this->buildPayload($request->validated(), $questionType->created_by);

        $oldValues = $this->auditValues($questionType->load('objectiveType:id,name'));
        $questionType->update($payload);
        $questionType->load('objectiveType:id,name');
        $newValues = $this->auditValues($questionType);

        $changes = array_filter(
            $newValues,
            fn ($value, $key) => ($oldValues[$key] ?? null) != $value,
            ARRAY_FILTER_USE_BOTH,
        );

        if (! empty($changes)) {
            AuditLog::record(
                model: $questionType,
                event: AuditEvent::Updated,
                oldValues: array_intersect_key($oldValues, $changes),
                newValues: $changes,
                notes: 'Question type updated.',
            );
        }

        $scope = $questionType->is_objective ? 'objective' : 'subjective';

        return redirect("/superadmin/question-types/{$scope}/{$questionType->id}")
            ->with('success', 'Question type updated successfully.');
    }

    public function destroy(QuestionType $questionType)
    {
        if ($questionType->questions()->exists()) {
            return redirect()->route('superadmin.question-types')
                ->with('error', 'Question type cannot be deleted while questions are linked to it.');
        }

        if ($questionType->objectiveChildren()->exists()) {
            return redirect()->route('superadmin.question-types')
                ->with('error', 'Question type cannot be deleted while objective types are linked to it.');
        }

        AuditLog::record(
            model: $questionType,
            event: AuditEvent::Deleted,
            oldValues: ['name' => $questionType->name, 'heading_en' => $questionType->heading_en],
            notes: 'Question type deleted.',
        );

        $questionType->delete();

        return redirect()->route('superadmin.question-types')
            ->with('success', 'Question type deleted successfully.');
    }

    private function buildPayload(array $validated, ?int $creatorId): array
    {
        $isObjective = (bool) ($validated['is_objective'] ?? false);
        $schema = QuestionTypeSchemaRegistry::resolve(
            $validated['schema_key'] ?? null,
            $isObjective,
        );
        $legacy = QuestionTypeSchemaRegistry::legacyAttributes(
            $schema['key'],
            $isObjective,
            $validated,
        );

        return [
            'name' => $validated['name'],
            'name_ur' => $validated['name_ur'] ?? null,
            'heading_en' => $validated['heading_en'],
            'heading_ur' => $validated['heading_ur'] ?? null,
            'description_en' => $validated['description_en'] ?? null,
            'description_ur' => $validated['description_ur'] ?? null,
            'have_exercise' => $legacy['have_exercise'],
            'have_statement' => $legacy['have_statement'],
            'statement_label' => $legacy['statement_label'],
            'have_description' => $legacy['have_description'],
            'description_label' => $legacy['description_label'],
            'have_answer' => $legacy['have_answer'],
            'is_single' => $legacy['is_single'],
            'is_objective' => $isObjective,
            'options_only' => $legacy['options_only'],
            'schema_key' => $schema['key'],
            'objective_type_id' => $legacy['objective_type_id'],
            'column_per_row' => $legacy['column_per_row'],
            'status' => $validated['status'],
            'created_by' => $creatorId,
        ];
    }

    private function auditValues(QuestionType $questionType): array
    {
        return [
            'name' => $questionType->name,
            'name_ur' => $questionType->name_ur,
            'heading_en' => $questionType->heading_en,
            'heading_ur' => $questionType->heading_ur,
            'have_answer' => $questionType->have_answer,
            'is_single' => $questionType->is_single,
            'is_objective' => $questionType->is_objective,
            'options_only' => $questionType->options_only,
            'schema' => QuestionTypeSchemaRegistry::resolve(
                $questionType->schema_key,
                $questionType->is_objective,
                [
                    'objective_type_id' => $questionType->objective_type_id,
                    'have_description' => $questionType->have_description,
                    'have_answer' => $questionType->have_answer,
                ],
            )['label'],
            'status' => $questionType->status,
        ];
    }

    private function orderCatalog(): array
    {
        return [
            'patterns' => Pattern::query()
                ->where('status', 1)
                ->orderBy('name')
                ->get(['id', 'name']),
            'patternClasses' => DB::table('pattern_classes')
                ->join('patterns', 'patterns.id', '=', 'pattern_classes.pattern_id')
                ->join('classes', 'classes.id', '=', 'pattern_classes.class_id')
                ->where('patterns.status', 1)
                ->where('classes.status', 1)
                ->orderBy('patterns.name')
                ->orderBy('classes.name')
                ->get([
                    'pattern_classes.pattern_id',
                    'classes.id',
                    'classes.name',
                ]),
            'classSubjects' => DB::table('class_subjects')
                ->join('patterns', 'patterns.id', '=', 'class_subjects.pattern_id')
                ->join('subjects', 'subjects.id', '=', 'class_subjects.subject_id')
                ->where('patterns.status', 1)
                ->where('subjects.status', 1)
                ->orderBy('patterns.name')
                ->orderBy('subjects.name_eng')
                ->get([
                    'class_subjects.pattern_id',
                    'class_subjects.class_id',
                    'class_subjects.subject_id',
                    'subjects.name_eng as name',
                ]),
        ];
    }

    private function scopedQuestionTypes(string $kind, Request $request): array
    {
        $scope = $this->requestedScope($kind, $request);
        if ($scope === null) {
            return [];
        }

        [$patternId, $classId, $subjectId] = $scope;
        $questionTypes = $this->scopedQuestionTypeQuery($kind, $patternId, $classId, $subjectId)
            ->with('objectiveType:id,name')
            ->withCount([
                'questions' => fn (Builder $query) => $query
                    ->where('questions.status', 1)
                    ->whereIn('questions.chapter_id', DB::table('chapters')
                        ->where('chapters.pattern_id', $patternId)
                        ->where('chapters.class_id', $classId)
                        ->where('chapters.subject_id', $subjectId)
                        ->select('chapters.id')),
                'objectiveChildren',
            ])
            ->orderBy('id')
            ->get([
                'id',
                'name',
                'name_ur',
                'heading_en',
                'heading_ur',
                'description_en',
                'description_ur',
                'have_exercise',
                'have_statement',
                'have_description',
                'have_answer',
                'is_single',
                'is_objective',
            'options_only',
                'schema_key',
                'objective_type_id',
                'column_per_row',
                'status',
                'created_at',
            ]);

        return $questionTypes
            ->map(fn (QuestionType $questionType) => $this->transformQuestionType($questionType))
            ->values()
            ->all();
    }

    private function scopedOrderIds(string $kind, Request $request): array
    {
        $scope = $this->requestedScope($kind, $request);
        if ($scope === null) {
            return [];
        }

        [$patternId, $classId, $subjectId] = $scope;
        $allIds = $this->scopedQuestionTypeQuery($kind, $patternId, $classId, $subjectId)
            ->orderBy('id')
            ->pluck('id')
            ->map(fn ($id) => (int) $id);
        $savedIds = QuestionTypeOrder::query()
            ->where('pattern_id', $patternId)
            ->where('class_id', $classId)
            ->where('subject_id', $subjectId)
            ->whereIn('question_type_id', $allIds)
            ->orderBy('sort_order')
            ->pluck('question_type_id')
            ->map(fn ($id) => (int) $id);

        return $savedIds
            ->concat($allIds->diff($savedIds))
            ->values()
            ->all();
    }

    private function scopedQuestionTypeQuery(
        string $kind,
        int $patternId,
        int $classId,
        int $subjectId,
    ): Builder {
        return QuestionType::query()
            ->where('is_objective', $kind === 'objective')
            ->where('status', 1)
            ->whereIn('question_types.id', DB::table('questions')
                ->join('chapters', 'chapters.id', '=', 'questions.chapter_id')
                ->where('questions.status', 1)
                ->where('chapters.pattern_id', $patternId)
                ->where('chapters.class_id', $classId)
                ->where('chapters.subject_id', $subjectId)
                ->select('questions.question_type_id'));
    }

    private function requestedScope(string $kind, Request $request): ?array
    {
        if (! in_array($kind, ['objective', 'subjective'], true)) {
            return null;
        }

        $patternId = (int) $request->query('pattern_id', 0);
        $classId = (int) $request->query('class_id', 0);
        $subjectId = (int) $request->query('subject_id', 0);

        if (
            $patternId < 1
            || $classId < 1
            || $subjectId < 1
            || ! $this->scopeExists($patternId, $classId, $subjectId)
        ) {
            return null;
        }

        return [$patternId, $classId, $subjectId];
    }

    private function scopeExists(int $patternId, int $classId, int $subjectId): bool
    {
        return DB::table('pattern_classes')
            ->where('pattern_id', $patternId)
            ->where('class_id', $classId)
            ->exists()
            && DB::table('class_subjects')
                ->where('pattern_id', $patternId)
                ->where('class_id', $classId)
                ->where('subject_id', $subjectId)
                ->exists();
    }

    private function transformQuestionType(QuestionType $questionType): array
    {
        $schema = QuestionTypeSchemaRegistry::resolve(
            $questionType->schema_key,
            $questionType->is_objective,
            [
                'objective_type_id' => $questionType->objective_type_id,
                'have_description' => $questionType->have_description,
                'have_answer' => $questionType->have_answer,
            ],
        );

        return [
            'id' => $questionType->id,
            'name' => $questionType->name,
            'name_ur' => $questionType->name_ur,
            'heading_en' => $questionType->heading_en,
            'heading_ur' => $questionType->heading_ur,
            'description_en' => $questionType->description_en,
            'description_ur' => $questionType->description_ur,
            'have_answer' => $questionType->have_answer,
            'is_single' => $questionType->is_single,
            'is_objective' => $questionType->is_objective,
            'options_only' => $questionType->options_only,
            'schema_key' => $schema['key'],
            'schema' => $schema,
            'status' => $questionType->status,
            'created_at' => $questionType->created_at?->toISOString(),
            'questions_count' => $questionType->questions_count,
            'objective_children_count' => $questionType->objective_children_count,
            'objective_type' => $questionType->objectiveType
                ? [
                    'id' => $questionType->objectiveType->id,
                    'name' => $questionType->objectiveType->name,
                    'heading_en' => $questionType->objectiveType->heading_en,
                ]
                : null,
        ];
    }
}
