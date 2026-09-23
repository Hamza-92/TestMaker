<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ObjectiveLayoutAssignment;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ObjectiveLayoutController extends Controller
{
    public function index()
    {
        $scopes = DB::table('class_subjects')
            ->join('patterns', 'patterns.id', '=', 'class_subjects.pattern_id')
            ->join('classes', 'classes.id', '=', 'class_subjects.class_id')
            ->join('subjects', 'subjects.id', '=', 'class_subjects.subject_id')
            ->leftJoin('mediums', 'mediums.id', '=', 'class_subjects.medium_id')
            ->leftJoin('objective_layout_assignments', function ($join): void {
                $join->on('objective_layout_assignments.pattern_id', '=', 'class_subjects.pattern_id')
                    ->on('objective_layout_assignments.class_id', '=', 'class_subjects.class_id')
                    ->on('objective_layout_assignments.subject_id', '=', 'class_subjects.subject_id');
            })
            ->orderBy('patterns.sort_order')
            ->orderBy('patterns.id')
            ->orderBy('classes.sort_order')
            ->orderBy('classes.id')
            ->orderBy('subjects.name_eng')
            ->get([
                'patterns.id as pattern_id',
                'patterns.name as pattern_name',
                'patterns.short_name as pattern_short_name',
                'classes.id as class_id',
                'classes.name as class_name',
                'subjects.id as subject_id',
                'subjects.name_eng as subject_name',
                'subjects.name_ur as subject_name_ur',
                'mediums.name as medium',
                'objective_layout_assignments.objective_layout',
                'objective_layout_assignments.show_bubbles',
            ])
            ->map(fn (object $row) => [
                'pattern_id' => (int) $row->pattern_id,
                'pattern_name' => $row->pattern_name,
                'pattern_short_name' => $row->pattern_short_name,
                'class_id' => (int) $row->class_id,
                'class_name' => $row->class_name,
                'subject_id' => (int) $row->subject_id,
                'subject_name' => $row->subject_name,
                'subject_name_ur' => $row->subject_name_ur,
                'medium' => $row->medium,
                'objective_layout' => in_array(
                    $row->objective_layout,
                    array_keys(ObjectiveLayoutAssignment::layouts()),
                    true,
                ) ? $row->objective_layout : ObjectiveLayoutAssignment::STANDARD,
                'show_bubbles' => (bool) $row->show_bubbles,
            ]);

        return Inertia::render('superadmin/objective-layouts', [
            'layouts' => collect(ObjectiveLayoutAssignment::layouts())
                ->map(fn (string $name, string $key) => compact('key', 'name'))
                ->values(),
            'patterns' => $scopes
                ->groupBy('pattern_id')
                ->map(function ($patternScopes) {
                    $first = $patternScopes->first();

                    return [
                        'id' => $first['pattern_id'],
                        'name' => $first['pattern_name'],
                        'short_name' => $first['pattern_short_name'],
                        'classes' => $patternScopes
                            ->groupBy('class_id')
                            ->map(function ($classScopes) {
                                $firstClass = $classScopes->first();

                                return [
                                    'id' => $firstClass['class_id'],
                                    'name' => $firstClass['class_name'],
                                    'subjects' => $classScopes->map(fn (array $scope) => [
                                        'id' => $scope['subject_id'],
                                        'name' => $scope['subject_name'],
                                        'name_ur' => $scope['subject_name_ur'],
                                        'medium' => $scope['medium'],
                                        'objective_layout' => $scope['objective_layout'],
                                        'show_bubbles' => $scope['show_bubbles'],
                                    ])->values(),
                                ];
                            })
                            ->values(),
                    ];
                })
                ->values(),
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'assignments' => ['required', 'array', 'min:1'],
            'assignments.*.pattern_id' => ['required', 'integer'],
            'assignments.*.class_id' => ['required', 'integer'],
            'assignments.*.subject_id' => ['required', 'integer'],
            'assignments.*.objective_layout' => [
                'required',
                'string',
                Rule::in(array_keys(ObjectiveLayoutAssignment::layouts())),
            ],
            'assignments.*.show_bubbles' => ['required', 'boolean'],
        ]);

        $assignments = collect($validated['assignments']);
        $submittedScopes = $assignments
            ->map(fn (array $scope) => ((int) $scope['pattern_id']).':'.((int) $scope['class_id']).':'.((int) $scope['subject_id']));

        $existingScopes = DB::table('class_subjects')
            ->whereIn('pattern_id', $assignments->pluck('pattern_id')->unique())
            ->whereIn('class_id', $assignments->pluck('class_id')->unique())
            ->whereIn('subject_id', $assignments->pluck('subject_id')->unique())
            ->get(['pattern_id', 'class_id', 'subject_id'])
            ->map(fn (object $scope) => $scope->pattern_id.':'.$scope->class_id.':'.$scope->subject_id)
            ->filter(fn (string $scope) => $submittedScopes->contains($scope))
            ->unique()
            ->sort()
            ->values();

        if (
            $submittedScopes->unique()->count() !== $submittedScopes->count()
            || $submittedScopes->unique()->sort()->values()->all() !== $existingScopes->all()
        ) {
            throw ValidationException::withMessages([
                'assignments' => 'The subject list has changed. Refresh the page and try again.',
            ]);
        }

        DB::transaction(function () use ($assignments): void {
            foreach ($assignments as $assignment) {
                $patternId = (int) $assignment['pattern_id'];
                $classId = (int) $assignment['class_id'];
                $subjectId = (int) $assignment['subject_id'];
                $layout = $assignment['objective_layout'];
                $showBubbles = $layout === ObjectiveLayoutAssignment::FEDERAL_ROW
                    && (bool) $assignment['show_bubbles'];
                $existing = ObjectiveLayoutAssignment::query()
                    ->where('pattern_id', $patternId)
                    ->where('class_id', $classId)
                    ->where('subject_id', $subjectId)
                    ->first();

                $previous = [
                    'objective_layout' => $existing?->objective_layout ?? ObjectiveLayoutAssignment::STANDARD,
                    'show_bubbles' => (bool) ($existing?->show_bubbles ?? false),
                ];
                $next = [
                    'objective_layout' => $layout,
                    'show_bubbles' => $showBubbles,
                ];

                if ($previous === $next) {
                    continue;
                }

                if ($layout === ObjectiveLayoutAssignment::STANDARD) {
                    $existing?->delete();
                } else {
                    ObjectiveLayoutAssignment::query()->updateOrCreate(
                        [
                            'pattern_id' => $patternId,
                            'class_id' => $classId,
                            'subject_id' => $subjectId,
                        ],
                        $next,
                    );
                }

                AuditLog::record(
                    model: Subject::query()->findOrFail($subjectId),
                    event: AuditEvent::Updated,
                    oldValues: ['pattern_id' => $patternId, 'class_id' => $classId, ...$previous],
                    newValues: ['pattern_id' => $patternId, 'class_id' => $classId, ...$next],
                    notes: 'Subject objective layout assignment updated.',
                );
            }
        });

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Objective layout assignments saved.',
        ]);
    }
}


