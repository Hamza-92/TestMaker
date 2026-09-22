<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PaperLayoutAssignment;
use App\Models\Pattern;
use App\Support\PaperLayouts\PaperLayoutRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PaperLayoutController extends Controller
{
    public function index()
    {
        $scopes = DB::table('pattern_classes')
            ->join('classes', 'classes.id', '=', 'pattern_classes.class_id')
            ->leftJoin('paper_layout_assignments', function ($join): void {
                $join->on('paper_layout_assignments.pattern_id', '=', 'pattern_classes.pattern_id')
                    ->on('paper_layout_assignments.class_id', '=', 'pattern_classes.class_id');
            })
            ->orderBy('classes.sort_order')
            ->orderBy('classes.id')
            ->get([
                'pattern_classes.pattern_id',
                'classes.id as class_id',
                'classes.name as class_name',
                'classes.status as class_status',
                'paper_layout_assignments.paper_layout',
            ])
            ->map(fn (object $row) => [
                'pattern_id' => (int) $row->pattern_id,
                'class_id' => (int) $row->class_id,
                'name' => $row->class_name,
                'status' => (int) $row->class_status,
                'paper_layout' => PaperLayoutRegistry::normalize($row->paper_layout),
            ]);

        $classesByPattern = $scopes->groupBy('pattern_id');
        $patterns = Pattern::query()
            ->ordered()
            ->get(['id', 'name', 'short_name', 'status'])
            ->map(fn (Pattern $pattern) => [
                'id' => $pattern->id,
                'name' => $pattern->name,
                'short_name' => $pattern->short_name,
                'status' => $pattern->status,
                'classes' => $classesByPattern->get($pattern->id, collect())
                    ->map(fn (array $scope) => [
                        'id' => $scope['class_id'],
                        'name' => $scope['name'],
                        'status' => $scope['status'],
                        'paper_layout' => $scope['paper_layout'],
                    ])
                    ->values(),
            ]);

        $assignedCounts = $scopes->countBy('paper_layout');
        $layouts = collect(PaperLayoutRegistry::all())
            ->map(fn (array $layout, string $key) => [
                'key' => $key,
                ...$layout,
                'patterns_count' => $assignedCounts->get($key, 0),
            ])
            ->values();

        return Inertia::render('superadmin/paper-layouts', [
            'layouts' => $layouts,
            'patterns' => $patterns,
        ]);
    }

    public function updateAssignments(Request $request)
    {
        $validated = $request->validate([
            'assignments' => ['required', 'array'],
            'assignments.*.pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'assignments.*.class_id' => ['required', 'integer', 'exists:classes,id'],
            'assignments.*.paper_layout' => [
                'required',
                'string',
                Rule::in(PaperLayoutRegistry::keys()),
            ],
        ]);

        $existingScopes = DB::table('pattern_classes')
            ->get(['pattern_id', 'class_id'])
            ->map(fn (object $scope) => $scope->pattern_id.':'.$scope->class_id)
            ->sort()
            ->values();

        $submittedScopes = collect($validated['assignments'])
            ->map(fn (array $assignment) => ((int) $assignment['pattern_id']).':'.((int) $assignment['class_id']));

        if (
            $submittedScopes->unique()->count() !== $submittedScopes->count()
            || $submittedScopes->sort()->values()->all() !== $existingScopes->all()
        ) {
            throw ValidationException::withMessages([
                'assignments' => 'The pattern and class list has changed. Refresh the page and try again.',
            ]);
        }

        DB::transaction(function () use ($validated): void {
            foreach ($validated['assignments'] as $assignment) {
                $patternId = (int) $assignment['pattern_id'];
                $classId = (int) $assignment['class_id'];
                $nextLayout = PaperLayoutRegistry::normalize($assignment['paper_layout']);
                $existing = PaperLayoutAssignment::query()
                    ->where('pattern_id', $patternId)
                    ->where('class_id', $classId)
                    ->first();
                $previousLayout = PaperLayoutRegistry::normalize($existing?->paper_layout);

                if ($previousLayout === $nextLayout) {
                    continue;
                }

                if ($nextLayout === PaperLayoutRegistry::STANDARD) {
                    $existing?->delete();
                } else {
                    PaperLayoutAssignment::query()->updateOrCreate(
                        ['pattern_id' => $patternId, 'class_id' => $classId],
                        ['paper_layout' => $nextLayout],
                    );
                }

                AuditLog::record(
                    model: Pattern::query()->findOrFail($patternId),
                    event: AuditEvent::Updated,
                    oldValues: ['class_id' => $classId, 'paper_layout' => $previousLayout],
                    newValues: ['class_id' => $classId, 'paper_layout' => $nextLayout],
                    notes: 'Class paper layout assignment updated.',
                );
            }
        });

        return back()->with('success', 'Paper layout assignments saved successfully.');
    }
}
