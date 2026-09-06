<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
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
        $patterns = Pattern::query()
            ->ordered()
            ->get(['id', 'name', 'short_name', 'paper_layout', 'status'])
            ->map(fn (Pattern $pattern) => [
                'id' => $pattern->id,
                'name' => $pattern->name,
                'short_name' => $pattern->short_name,
                'paper_layout' => PaperLayoutRegistry::normalize($pattern->paper_layout),
                'status' => $pattern->status,
            ]);

        $assignedCounts = $patterns->countBy('paper_layout');

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
            'assignments.*.pattern_id' => ['required', 'integer', 'distinct', 'exists:patterns,id'],
            'assignments.*.paper_layout' => [
                'required',
                'string',
                Rule::in(PaperLayoutRegistry::keys()),
            ],
        ]);

        $existingIds = Pattern::query()->pluck('id')->map(fn ($id) => (int) $id)->sort()->values();
        $submittedIds = collect($validated['assignments'])
            ->pluck('pattern_id')
            ->map(fn ($id) => (int) $id)
            ->sort()
            ->values();

        if ($submittedIds->all() !== $existingIds->all()) {
            throw ValidationException::withMessages([
                'assignments' => 'The pattern list has changed. Refresh the page and try again.',
            ]);
        }

        DB::transaction(function () use ($validated): void {
            foreach ($validated['assignments'] as $assignment) {
                $pattern = Pattern::query()->findOrFail($assignment['pattern_id']);
                $nextLayout = PaperLayoutRegistry::normalize($assignment['paper_layout']);
                $previousLayout = PaperLayoutRegistry::normalize($pattern->paper_layout);

                if ($previousLayout === $nextLayout) {
                    continue;
                }

                $pattern->update(['paper_layout' => $nextLayout]);

                AuditLog::record(
                    model: $pattern,
                    event: AuditEvent::Updated,
                    oldValues: ['paper_layout' => $previousLayout],
                    newValues: ['paper_layout' => $nextLayout],
                    notes: 'Paper layout assignment updated.',
                );
            }
        });

        return back()->with('success', 'Paper layout assignments saved successfully.');
    }
}
