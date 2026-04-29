<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Pattern;
use App\Models\SchoolClass;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PatternController extends Controller
{
    public function index()
    {
        $patterns = Pattern::orderByDesc('created_at')
            ->get(['id', 'name', 'short_name', 'status', 'created_at']);

        return Inertia::render('superadmin/patterns', [
            'patterns' => $patterns,
        ]);
    }

    public function show(Pattern $pattern)
    {
        $pattern->load([
            'classes:id,name,status',
            'auditLogs.changedBy:id,name',
        ]);

        return Inertia::render('superadmin/patterns/show', [
            'pattern' => [
                'id'         => $pattern->id,
                'name'       => $pattern->name,
                'short_name' => $pattern->short_name,
                'status'     => $pattern->status,
                'created_at' => $pattern->created_at?->toISOString(),
                'classes'    => $pattern->classes->map(fn ($c) => [
                    'id'     => $c->id,
                    'name'   => $c->name,
                    'status' => $c->status,
                ]),
                'audit_logs' => $pattern->auditLogs->map(fn ($log) => [
                    'id'             => $log->id,
                    'event'          => $log->event?->value,
                    'old_values'     => $log->old_values ?? [],
                    'new_values'     => $log->new_values ?? [],
                    'changed_by'     => $log->changedBy?->name ?? 'System',
                    'created_at'     => $log->created_at?->toISOString(),
                ]),
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('superadmin/patterns/add');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:100', 'unique:patterns,name'],
            'short_name' => ['nullable', 'string', 'max:50'],
            'status'     => ['required', 'boolean'],
        ]);

        $validated['created_by'] = auth()->id();
        $pattern = Pattern::create($validated);

        AuditLog::record(
            model:     $pattern,
            event:     AuditEvent::Created,
            newValues: ['name' => $pattern->name, 'short_name' => $pattern->short_name, 'status' => $pattern->status],
            notes:     'Pattern created.',
        );

        return redirect()->route('superadmin.patterns')
            ->with('success', 'Pattern created successfully.');
    }

    public function edit(Pattern $pattern)
    {
        return Inertia::render('superadmin/patterns/edit', [
            'pattern' => $pattern->only(['id', 'name', 'short_name', 'status']),
        ]);
    }

    public function update(Request $request, Pattern $pattern)
    {
        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:100', Rule::unique('patterns', 'name')->ignore($pattern->id)],
            'short_name' => ['nullable', 'string', 'max:50'],
            'status'     => ['required', 'boolean'],
        ]);

        $oldValues = $pattern->only(['name', 'short_name', 'status']);
        $pattern->update($validated);
        $changes = array_filter(
            $validated,
            fn ($v, $k) => $oldValues[$k] != $v,
            ARRAY_FILTER_USE_BOTH
        );

        if (!empty($changes)) {
            AuditLog::record(
                model:     $pattern,
                event:     AuditEvent::Updated,
                oldValues: array_intersect_key($oldValues, $changes),
                newValues: $changes,
                notes:     'Pattern updated.',
            );
        }

        return redirect()->route('superadmin.patterns.show', $pattern)
            ->with('success', 'Pattern updated successfully.');
    }

    public function showClass(Pattern $pattern, SchoolClass $class)
    {
        $class->load([
            'patterns:id,name,short_name,status',
            'classSubjects' => fn ($q) => $q->where('pattern_id', $pattern->id),
            'classSubjects.subject:id,name_eng,name_ur,subject_type,status',
            'classSubjects.pattern:id,name,short_name',
            'auditLogs.changedBy:id,name',
        ]);

        $subjectsByPattern = $class->classSubjects
            ->groupBy('pattern_id')
            ->map(fn ($items) => [
                'pattern'  => $items->first()->pattern,
                'subjects' => $items->map(fn ($cs) => $cs->subject)->filter()->values(),
            ])
            ->values();

        return Inertia::render('superadmin/classes/show', [
            'schoolClass' => [
                'id'                  => $class->id,
                'name'                => $class->name,
                'status'              => $class->status,
                'created_at'          => $class->created_at?->toISOString(),
                'patterns'            => $class->patterns,
                'subjects_by_pattern' => $subjectsByPattern,
                'audit_logs'          => $class->auditLogs->map(fn ($log) => [
                    'id'         => $log->id,
                    'event'      => $log->event?->value,
                    'old_values' => $log->old_values ?? [],
                    'new_values' => $log->new_values ?? [],
                    'changed_by' => $log->changedBy?->name ?? 'System',
                    'created_at' => $log->created_at?->toISOString(),
                ]),
            ],
            'backHref'      => "/superadmin/patterns/{$pattern->id}",
            'scopedPattern' => [
                'id'         => $pattern->id,
                'name'       => $pattern->name,
                'short_name' => $pattern->short_name,
            ],
        ]);
    }

    public function destroy(Pattern $pattern)
    {
        AuditLog::record(
            model:     $pattern,
            event:     AuditEvent::Deleted,
            oldValues: ['name' => $pattern->name],
            notes:     'Pattern deleted.',
        );

        $pattern->delete();

        return redirect()->route('superadmin.patterns')
            ->with('success', 'Pattern deleted successfully.');
    }
}
