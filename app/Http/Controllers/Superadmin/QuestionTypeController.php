<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Superadmin\QuestionTypeUpsertRequest;
use App\Models\AuditLog;
use App\Models\QuestionType;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use Inertia\Inertia;

class QuestionTypeController extends Controller
{
    public function index()
    {
        return $this->renderIndex('all');
    }

    public function objectiveIndex()
    {
        return $this->renderIndex('objective');
    }

    public function subjectiveIndex()
    {
        return $this->renderIndex('subjective');
    }

    private function renderIndex(string $initialKind)
    {
        $questionTypes = QuestionType::with('objectiveType:id,name')
            ->withCount(['questions', 'objectiveChildren'])
            ->orderByDesc('created_at')
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
        ]);
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
