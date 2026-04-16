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

class ClassController extends Controller
{
    public function index()
    {
        $classes = SchoolClass::with('patterns:id,name,short_name')
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'status', 'created_at']);

        return Inertia::render('superadmin/classes', [
            'classes' => $classes,
        ]);
    }

    public function show(SchoolClass $class)
    {
        $class->load([
            'patterns:id,name,short_name,status',
            'classSubjects.subject:id,name_eng,name_ur,subject_type,status',
            'classSubjects.pattern:id,name,short_name',
            'auditLogs.changedBy:id,name',
        ]);

        // Group subjects by pattern
        $subjectsByPattern = $class->classSubjects
            ->groupBy('pattern_id')
            ->map(fn ($items) => [
                'pattern' => $items->first()->pattern,
                'subjects' => $items->map(fn ($cs) => $cs->subject)->filter()->values(),
            ])
            ->values();

        return Inertia::render('superadmin/classes/show', [
            'schoolClass' => [
                'id'                => $class->id,
                'name'              => $class->name,
                'status'            => $class->status,
                'created_at'        => $class->created_at?->toISOString(),
                'patterns'          => $class->patterns,
                'subjects_by_pattern' => $subjectsByPattern,
                'audit_logs'        => $class->auditLogs->map(fn ($log) => [
                    'id'         => $log->id,
                    'event'      => $log->event?->value,
                    'old_values' => $log->old_values ?? [],
                    'new_values' => $log->new_values ?? [],
                    'changed_by' => $log->changedBy?->name ?? 'System',
                    'created_at' => $log->created_at?->toISOString(),
                ]),
            ],
        ]);
    }

    public function create()
    {
        $patterns = Pattern::where('status', 1)
            ->orderBy('name')
            ->get(['id', 'name', 'short_name']);

        return Inertia::render('superadmin/classes/add', [
            'patterns' => $patterns,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:50', 'unique:classes,name'],
            'status'        => ['required', 'boolean'],
            'pattern_ids'   => ['array'],
            'pattern_ids.*' => ['integer', 'exists:patterns,id'],
        ]);

        $class = SchoolClass::create([
            'name'       => $validated['name'],
            'status'     => $validated['status'],
            'created_by' => auth()->id(),
        ]);

        $class->patterns()->sync($validated['pattern_ids'] ?? []);

        AuditLog::record(
            model:     $class,
            event:     AuditEvent::Created,
            newValues: [
                'name'        => $class->name,
                'status'      => $class->status,
                'pattern_ids' => $validated['pattern_ids'] ?? [],
            ],
            notes: 'Class created.',
        );

        return redirect()->route('superadmin.classes')
            ->with('success', 'Class created successfully.');
    }

    public function edit(SchoolClass $class)
    {
        $patterns = Pattern::where('status', 1)
            ->orderBy('name')
            ->get(['id', 'name', 'short_name']);

        $class->load('patterns:id');

        return Inertia::render('superadmin/classes/edit', [
            'schoolClass' => [
                'id'          => $class->id,
                'name'        => $class->name,
                'status'      => $class->status,
                'pattern_ids' => $class->patterns->pluck('id'),
            ],
            'patterns' => $patterns,
        ]);
    }

    public function update(Request $request, SchoolClass $class)
    {
        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:50', Rule::unique('classes', 'name')->ignore($class->id)],
            'status'        => ['required', 'boolean'],
            'pattern_ids'   => ['array'],
            'pattern_ids.*' => ['integer', 'exists:patterns,id'],
        ]);

        $oldName   = $class->name;
        $oldStatus = $class->status;
        $oldPatternIds = $class->patterns()->pluck('patterns.id')->toArray();

        $class->update([
            'name'   => $validated['name'],
            'status' => $validated['status'],
        ]);

        $class->patterns()->sync($validated['pattern_ids'] ?? []);

        $newPatternIds = $validated['pattern_ids'] ?? [];
        $changes = [];
        if ($oldName   !== $class->name)   $changes['name']   = ['old' => $oldName,   'new' => $class->name];
        if ($oldStatus !== $class->status) $changes['status'] = ['old' => $oldStatus, 'new' => $class->status];
        if (sort($oldPatternIds) !== sort($newPatternIds)) {
            $changes['pattern_ids'] = ['old' => $oldPatternIds, 'new' => $newPatternIds];
        }

        if (!empty($changes)) {
            AuditLog::record(
                model:     $class,
                event:     AuditEvent::Updated,
                oldValues: array_column($changes, 'old', array_keys($changes)[0]) + array_combine(array_keys($changes), array_column($changes, 'old')),
                newValues: array_combine(array_keys($changes), array_column($changes, 'new')),
                notes:     'Class updated.',
            );
        }

        return redirect()->route('superadmin.classes.show', $class)
            ->with('success', 'Class updated successfully.');
    }

    public function destroy(SchoolClass $class)
    {
        AuditLog::record(
            model:     $class,
            event:     AuditEvent::Deleted,
            oldValues: ['name' => $class->name],
            notes:     'Class deleted.',
        );

        $class->delete();

        return redirect()->route('superadmin.classes')
            ->with('success', 'Class deleted successfully.');
    }
}
