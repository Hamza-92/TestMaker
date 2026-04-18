<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ClassSubject;
use App\Models\Pattern;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SubjectController extends Controller
{
    public function index()
    {
        $subjects = Subject::with([
            'classSubjects.schoolClass:id,name',
            'classSubjects.pattern:id,name,short_name',
        ])
            ->orderByDesc('created_at')
            ->get(['id', 'name_eng', 'name_ur', 'subject_type', 'status', 'created_at']);

        return Inertia::render('superadmin/subjects', [
            'subjects' => $subjects,
        ]);
    }

    public function show(Subject $subject)
    {
        $chaptersWith = ['schoolClass:id,name', 'pattern:id,name,short_name'];
        if ($subject->subject_type === 'topic-wise') {
            $chaptersWith['topics'] = fn ($q) => $q->orderBy('sort_id')->orderBy('name');
        }

        $subject->load([
            'classSubjects.schoolClass:id,name,status',
            'classSubjects.pattern:id,name,short_name',
            'auditLogs.changedBy:id,name',
            'chapters' => fn ($q) => $q->with($chaptersWith)
                ->orderBy('pattern_id')->orderBy('class_id')
                ->orderBy('chapter_number')->orderBy('sort_id'),
        ]);

        $linksByPattern = $subject->classSubjects
            ->groupBy('pattern_id')
            ->map(fn ($items) => [
                'pattern' => $items->first()->pattern,
                'classes' => $items->map(fn ($cs) => $cs->schoolClass)->filter()->values(),
            ])
            ->values();

        $chapters = $subject->chapters->map(fn ($ch) => [
            'id'             => $ch->id,
            'name'           => $ch->name,
            'name_ur'        => $ch->name_ur,
            'chapter_number' => $ch->chapter_number,
            'sort_id'        => $ch->sort_id,
            'status'         => $ch->status,
            'class_id'       => $ch->class_id,
            'pattern_id'     => $ch->pattern_id,
            'class'          => $ch->schoolClass ? ['id' => $ch->schoolClass->id, 'name' => $ch->schoolClass->name] : null,
            'pattern'        => $ch->pattern    ? ['id' => $ch->pattern->id,    'name' => $ch->pattern->name]    : null,
            'topics'         => $subject->subject_type === 'topic-wise'
                ? $ch->topics->map(fn ($t) => [
                    'id'      => $t->id,
                    'name'    => $t->name,
                    'name_ur' => $t->name_ur,
                    'sort_id' => $t->sort_id,
                    'status'  => $t->status,
                ])->values()
                : [],
        ])->values();

        return Inertia::render('superadmin/subjects/show', [
            'subject' => [
                'id'               => $subject->id,
                'name_eng'         => $subject->name_eng,
                'name_ur'          => $subject->name_ur,
                'subject_type'     => $subject->subject_type,
                'status'           => $subject->status,
                'created_at'       => $subject->created_at?->toISOString(),
                'links_by_pattern' => $linksByPattern,
                'chapters'         => $chapters,
                'audit_logs'       => $subject->auditLogs->map(fn ($log) => [
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
            ->with(['classes' => fn ($q) => $q->where('status', 1)->orderBy('name')->select('classes.id', 'classes.name')])
            ->orderBy('name')
            ->get(['id', 'name', 'short_name'])
            ->filter(fn ($p) => $p->classes->isNotEmpty())
            ->values();

        return Inertia::render('superadmin/subjects/add', [
            'patterns' => $patterns,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name_eng'              => ['required', 'string', 'max:100', 'unique:subjects,name_eng'],
            'name_ur'               => ['nullable', 'string', 'max:100'],
            'subject_type'          => ['required', 'in:chapter-wise,topic-wise'],
            'status'                => ['required', 'boolean'],
            'links'                 => ['array'],
            'links.*.class_id'      => ['required', 'integer', 'exists:classes,id'],
            'links.*.pattern_id'    => ['required', 'integer', 'exists:patterns,id'],
        ]);

        $subject = Subject::create([
            'name_eng'     => $validated['name_eng'],
            'name_ur'      => $validated['name_ur'] ?? null,
            'subject_type' => $validated['subject_type'],
            'status'       => $validated['status'],
            'created_by'   => auth()->id(),
        ]);

        $this->syncLinks($subject, $validated['links'] ?? []);

        AuditLog::record(
            model:     $subject,
            event:     AuditEvent::Created,
            newValues: [
                'name_eng'     => $subject->name_eng,
                'name_ur'      => $subject->name_ur,
                'subject_type' => $subject->subject_type,
                'status'       => $subject->status,
                'links'        => $validated['links'] ?? [],
            ],
            notes: 'Subject created.',
        );

        return redirect()->route('superadmin.subjects')
            ->with('success', 'Subject created successfully.');
    }

    public function edit(Subject $subject)
    {
        $patterns = Pattern::where('status', 1)
            ->with(['classes' => fn ($q) => $q->where('status', 1)->orderBy('name')->select('classes.id', 'classes.name')])
            ->orderBy('name')
            ->get(['id', 'name', 'short_name'])
            ->filter(fn ($p) => $p->classes->isNotEmpty())
            ->values();

        $existingLinks = $subject->classSubjects()
            ->get(['class_id', 'pattern_id'])
            ->map(fn ($cs) => ['class_id' => $cs->class_id, 'pattern_id' => $cs->pattern_id]);

        return Inertia::render('superadmin/subjects/edit', [
            'subject'       => $subject->only(['id', 'name_eng', 'name_ur', 'subject_type', 'status']),
            'patterns'      => $patterns,
            'existingLinks' => $existingLinks,
        ]);
    }

    public function update(Request $request, Subject $subject)
    {
        $validated = $request->validate([
            'name_eng'              => ['required', 'string', 'max:100', Rule::unique('subjects', 'name_eng')->ignore($subject->id)],
            'name_ur'               => ['nullable', 'string', 'max:100'],
            'subject_type'          => ['required', 'in:chapter-wise,topic-wise'],
            'status'                => ['required', 'boolean'],
            'links'                 => ['array'],
            'links.*.class_id'      => ['required', 'integer', 'exists:classes,id'],
            'links.*.pattern_id'    => ['required', 'integer', 'exists:patterns,id'],
        ]);

        $oldValues = $subject->only(['name_eng', 'name_ur', 'subject_type', 'status']);
        $subject->update([
            'name_eng'     => $validated['name_eng'],
            'name_ur'      => $validated['name_ur'] ?? null,
            'subject_type' => $validated['subject_type'],
            'status'       => $validated['status'],
        ]);

        $this->syncLinks($subject, $validated['links'] ?? []);

        AuditLog::record(
            model:     $subject,
            event:     AuditEvent::Updated,
            oldValues: $oldValues,
            newValues: $subject->only(['name_eng', 'name_ur', 'subject_type', 'status']),
            notes:     'Subject updated.',
        );

        return redirect()->route('superadmin.subjects.show', $subject)
            ->with('success', 'Subject updated successfully.');
    }

    public function destroy(Subject $subject)
    {
        AuditLog::record(
            model:     $subject,
            event:     AuditEvent::Deleted,
            oldValues: ['name_eng' => $subject->name_eng],
            notes:     'Subject deleted.',
        );

        $subject->delete();

        return redirect()->route('superadmin.subjects')
            ->with('success', 'Subject deleted successfully.');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function syncLinks(Subject $subject, array $links): void
    {
        $subject->classSubjects()->delete();

        $rows = collect($links)->unique(fn ($l) => $l['class_id'].'-'.$l['pattern_id']);

        foreach ($rows as $link) {
            ClassSubject::create([
                'subject_id' => $subject->id,
                'class_id'   => $link['class_id'],
                'pattern_id' => $link['pattern_id'],
            ]);
        }
    }
}
