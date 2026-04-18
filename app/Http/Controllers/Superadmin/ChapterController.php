<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ChapterController extends Controller
{
    public function store(Request $request, Subject $subject)
    {
        $validated = $request->validate([
            'class_id'       => ['required', 'integer', 'exists:classes,id'],
            'pattern_id'     => ['required', 'integer', 'exists:patterns,id'],
            'name'           => ['required', 'string', 'max:150'],
            'name_ur'        => ['nullable', 'string', 'max:150'],
            'chapter_number' => [
                'nullable', 'integer', 'min:1',
                Rule::unique('chapters')->where(fn ($q) => $q
                    ->where('subject_id', $subject->id)
                    ->where('class_id', $request->class_id)
                    ->where('pattern_id', $request->pattern_id)
                ),
            ],
            'status'         => ['required', 'boolean'],
        ]);

        abort_unless(
            $subject->classSubjects()
                ->where('class_id', $validated['class_id'])
                ->where('pattern_id', $validated['pattern_id'])
                ->exists(),
            422,
            'This class–pattern combination is not linked to this subject.'
        );

        Chapter::create([
            'subject_id'     => $subject->id,
            'class_id'       => $validated['class_id'],
            'pattern_id'     => $validated['pattern_id'],
            'name'           => $validated['name'],
            'name_ur'        => $validated['name_ur'] ?? null,
            'chapter_number' => $validated['chapter_number'] ?? null,
            'status'         => $validated['status'],
            'created_by'     => auth()->id(),
        ]);

        return back()->with('success', 'Chapter added successfully.');
    }

    public function update(Request $request, Subject $subject, Chapter $chapter)
    {
        abort_if($chapter->subject_id !== $subject->id, 403);

        $validated = $request->validate([
            'name'           => ['required', 'string', 'max:150'],
            'name_ur'        => ['nullable', 'string', 'max:150'],
            'chapter_number' => [
                'nullable', 'integer', 'min:1',
                Rule::unique('chapters')->where(fn ($q) => $q
                    ->where('subject_id', $subject->id)
                    ->where('class_id', $chapter->class_id)
                    ->where('pattern_id', $chapter->pattern_id)
                )->ignore($chapter->id),
            ],
            'status'         => ['required', 'boolean'],
        ]);

        $chapter->update([
            'name'           => $validated['name'],
            'name_ur'        => $validated['name_ur'] ?? null,
            'chapter_number' => $validated['chapter_number'] ?? null,
            'status'         => $validated['status'],
        ]);

        return back()->with('success', 'Chapter updated successfully.');
    }

    public function destroy(Subject $subject, Chapter $chapter)
    {
        abort_if($chapter->subject_id !== $subject->id, 403);

        $chapter->delete();

        return back()->with('success', 'Chapter deleted.');
    }
}
