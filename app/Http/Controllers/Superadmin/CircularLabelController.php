<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Pattern;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CircularLabelController extends Controller
{
    public function index()
    {
        $classesByPattern = DB::table('pattern_classes')
            ->join('classes', 'classes.id', '=', 'pattern_classes.class_id')
            ->orderBy('classes.sort_order')
            ->orderBy('classes.id')
            ->get([
                'pattern_classes.pattern_id',
                'classes.id',
                'classes.name',
                'classes.status',
                'pattern_classes.circular_labels_default',
            ])
            ->groupBy('pattern_id');

        $patterns = Pattern::query()
            ->ordered()
            ->get(['id', 'name', 'short_name', 'status'])
            ->map(fn (Pattern $pattern) => [
                'id' => $pattern->id,
                'name' => $pattern->name,
                'short_name' => $pattern->short_name,
                'status' => $pattern->status,
                'classes' => $classesByPattern->get($pattern->id, collect())
                    ->map(fn (object $class) => [
                        'id' => (int) $class->id,
                        'name' => $class->name,
                        'status' => (int) $class->status,
                        'circular_labels_default' => (bool) $class->circular_labels_default,
                    ])
                    ->values(),
            ]);

        return Inertia::render('superadmin/circular-labels', [
            'patterns' => $patterns,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'assignments' => ['required', 'array', 'min:1'],
            'assignments.*' => ['required', 'array:pattern_id,class_id,enabled'],
            'assignments.*.pattern_id' => ['required', 'integer'],
            'assignments.*.class_id' => ['required', 'integer'],
            'assignments.*.enabled' => ['required', 'boolean'],
        ]);

        $assignments = collect($validated['assignments']);
        $submittedScopes = $assignments
            ->map(fn (array $assignment) => ((int) $assignment['pattern_id']).':'.((int) $assignment['class_id']));
        $existingScopes = DB::table('pattern_classes')
            ->whereIn('pattern_id', $assignments->pluck('pattern_id')->unique())
            ->whereIn('class_id', $assignments->pluck('class_id')->unique())
            ->get(['pattern_id', 'class_id'])
            ->map(fn (object $scope) => $scope->pattern_id.':'.$scope->class_id)
            ->filter(fn (string $scope) => $submittedScopes->contains($scope))
            ->sort()
            ->values();

        if (
            $submittedScopes->unique()->count() !== $submittedScopes->count()
            || $submittedScopes->sort()->values()->all() !== $existingScopes->all()
        ) {
            throw ValidationException::withMessages([
                'assignments' => 'A pattern and class assignment has changed. Refresh the page and try again.',
            ]);
        }

        DB::transaction(function () use ($assignments): void {
            foreach ($assignments as $assignment) {
                $patternId = (int) $assignment['pattern_id'];
                $classId = (int) $assignment['class_id'];
                $enabled = (bool) $assignment['enabled'];
                $scope = DB::table('pattern_classes')
                    ->where('pattern_id', $patternId)
                    ->where('class_id', $classId);
                $previous = (bool) $scope->value('circular_labels_default');

                if ($previous === $enabled) {
                    continue;
                }

                $scope->update(['circular_labels_default' => $enabled]);

                AuditLog::record(
                    model: Pattern::query()->findOrFail($patternId),
                    event: AuditEvent::Updated,
                    oldValues: ['class_id' => $classId, 'circular_labels_default' => $previous],
                    newValues: ['class_id' => $classId, 'circular_labels_default' => $enabled],
                    notes: 'Class circular labels default updated.',
                );
            }
        });

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Circular label defaults saved.',
        ]);
    }
}
