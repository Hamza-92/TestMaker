<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Superadmin\QuestionTypeUpsertRequest;
use App\Models\AuditLog;
use App\Models\QuestionType;
use Illuminate\Support\Collection;
use Inertia\Inertia;

class QuestionTypeController extends Controller
{
    public function index()
    {
        $questionTypes = QuestionType::with('objectiveType:id,name')
            ->withCount(['questions', 'objectiveChildren'])
            ->orderByDesc('created_at')
            ->get([
                'id',
                'name',
                'name_ur',
                'heading_en',
                'have_exercise',
                'have_statement',
                'have_description',
                'have_answer',
                'is_single',
                'is_objective',
                'objective_type_id',
                'column_per_row',
                'status',
                'created_at',
            ]);

        return Inertia::render('superadmin/question-types', [
            'questionTypes' => $questionTypes->map(fn (QuestionType $questionType) => [
                'id' => $questionType->id,
                'name' => $questionType->name,
                'name_ur' => $questionType->name_ur,
                'heading_en' => $questionType->heading_en,
                'have_exercise' => $questionType->have_exercise,
                'have_statement' => $questionType->have_statement,
                'have_description' => $questionType->have_description,
                'have_answer' => $questionType->have_answer,
                'is_single' => $questionType->is_single,
                'is_objective' => $questionType->is_objective,
                'column_per_row' => $questionType->column_per_row,
                'status' => $questionType->status,
                'created_at' => $questionType->created_at?->toISOString(),
                'questions_count' => $questionType->questions_count,
                'objective_children_count' => $questionType->objective_children_count,
                'objective_type' => $questionType->objectiveType
                    ? ['id' => $questionType->objectiveType->id, 'name' => $questionType->objectiveType->name]
                    : null,
            ])->values(),
        ]);
    }

    public function show(QuestionType $questionType)
    {
        $questionType->load([
            'objectiveType:id,name,heading_en',
            'auditLogs.changedBy:id,name',
        ])->loadCount(['questions', 'objectiveChildren']);

        return Inertia::render('superadmin/question-types/show', [
            'questionType' => [
                'id' => $questionType->id,
                'name' => $questionType->name,
                'name_ur' => $questionType->name_ur,
                'heading_en' => $questionType->heading_en,
                'heading_ur' => $questionType->heading_ur,
                'description_en' => $questionType->description_en,
                'description_ur' => $questionType->description_ur,
                'have_exercise' => $questionType->have_exercise,
                'have_statement' => $questionType->have_statement,
                'statement_label' => $questionType->statement_label,
                'have_description' => $questionType->have_description,
                'description_label' => $questionType->description_label,
                'have_answer' => $questionType->have_answer,
                'is_single' => $questionType->is_single,
                'is_objective' => $questionType->is_objective,
                'column_per_row' => $questionType->column_per_row,
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
                'audit_logs' => $questionType->auditLogs->map(fn ($log) => [
                    'id' => $log->id,
                    'event' => $log->event?->value,
                    'old_values' => $log->old_values ?? [],
                    'new_values' => $log->new_values ?? [],
                    'changed_by' => $log->changedBy?->name ?? 'System',
                    'created_at' => $log->created_at?->toISOString(),
                ])->values(),
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('superadmin/question-types/add', [
            'objectiveTypes' => $this->objectiveTypeOptions(),
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
        return Inertia::render('superadmin/question-types/edit', [
            'questionType' => [
                'id' => $questionType->id,
                'name' => $questionType->name,
                'name_ur' => $questionType->name_ur,
                'heading_en' => $questionType->heading_en,
                'heading_ur' => $questionType->heading_ur,
                'description_en' => $questionType->description_en,
                'description_ur' => $questionType->description_ur,
                'have_exercise' => $questionType->have_exercise,
                'have_statement' => $questionType->have_statement,
                'statement_label' => $questionType->statement_label,
                'have_description' => $questionType->have_description,
                'description_label' => $questionType->description_label,
                'have_answer' => $questionType->have_answer,
                'is_single' => $questionType->is_single,
                'is_objective' => $questionType->is_objective,
                'objective_type_id' => $questionType->objective_type_id,
                'column_per_row' => $questionType->column_per_row,
                'status' => $questionType->status,
            ],
            'objectiveTypes' => $this->objectiveTypeOptions($questionType->id),
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

        return redirect()->route('superadmin.question-types.show', $questionType)
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
        $hasStatement = (bool) ($validated['have_statement'] ?? false);
        $hasDescription = (bool) ($validated['have_description'] ?? false);
        $isObjective = (bool) ($validated['is_objective'] ?? false);

        return [
            'name' => $validated['name'],
            'name_ur' => $validated['name_ur'] ?? null,
            'heading_en' => $validated['heading_en'],
            'heading_ur' => $validated['heading_ur'] ?? null,
            'description_en' => $validated['description_en'] ?? null,
            'description_ur' => $validated['description_ur'] ?? null,
            'have_exercise' => $validated['have_exercise'],
            'have_statement' => $hasStatement,
            'statement_label' => $hasStatement
                ? ($validated['statement_label'] ?? 'Statement')
                : null,
            'have_description' => $hasDescription,
            'description_label' => $hasDescription
                ? ($validated['description_label'] ?? 'Description')
                : null,
            'have_answer' => $validated['have_answer'],
            'is_single' => $validated['is_single'],
            'is_objective' => $isObjective,
            'objective_type_id' => $isObjective
                ? ($validated['objective_type_id'] ?? null)
                : null,
            'column_per_row' => $validated['column_per_row'],
            'status' => $validated['status'],
            'created_by' => $creatorId,
        ];
    }

    private function objectiveTypeOptions(?int $exceptId = null): Collection
    {
        return QuestionType::query()
            ->where('is_objective', true)
            ->when($exceptId, fn ($query) => $query->whereKeyNot($exceptId))
            ->orderBy('name')
            ->get(['id', 'name', 'heading_en'])
            ->map(fn (QuestionType $questionType) => [
                'id' => $questionType->id,
                'name' => $questionType->name,
                'heading_en' => $questionType->heading_en,
            ])
            ->values();
    }

    private function auditValues(QuestionType $questionType): array
    {
        return [
            'name' => $questionType->name,
            'name_ur' => $questionType->name_ur,
            'heading_en' => $questionType->heading_en,
            'heading_ur' => $questionType->heading_ur,
            'statement_label' => $questionType->statement_label,
            'description_label' => $questionType->description_label,
            'have_exercise' => $questionType->have_exercise,
            'have_statement' => $questionType->have_statement,
            'have_description' => $questionType->have_description,
            'have_answer' => $questionType->have_answer,
            'is_single' => $questionType->is_single,
            'is_objective' => $questionType->is_objective,
            'objective_type' => $questionType->objectiveType?->name,
            'column_per_row' => $questionType->column_per_row,
            'status' => $questionType->status,
        ];
    }
}
