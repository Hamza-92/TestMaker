<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
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

    public function create()
    {
        // Patterns with only their classes that are actually linked via pattern_classes
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
            'subject' => $subject->only(['id', 'name_eng', 'name_ur', 'subject_type', 'status']),
            'patterns' => $patterns,
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

        $subject->update([
            'name_eng'     => $validated['name_eng'],
            'name_ur'      => $validated['name_ur'] ?? null,
            'subject_type' => $validated['subject_type'],
            'status'       => $validated['status'],
        ]);

        $this->syncLinks($subject, $validated['links'] ?? []);

        return redirect()->route('superadmin.subjects')
            ->with('success', 'Subject updated successfully.');
    }

    public function destroy(Subject $subject)
    {
        $subject->delete();

        return redirect()->route('superadmin.subjects')
            ->with('success', 'Subject deleted successfully.');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function syncLinks(Subject $subject, array $links): void
    {
        // Remove all existing links then insert the new set
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
