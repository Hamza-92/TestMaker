<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\Subject;
use App\Models\Topic;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TopicController extends Controller
{
    public function store(Request $request, Subject $subject, Chapter $chapter)
    {
        abort_if($chapter->subject_id !== $subject->id, 403);

        $validated = $request->validate([
            'name'    => [
                'required', 'string', 'max:150',
                Rule::unique('topics')->where(fn ($q) => $q->where('chapter_id', $chapter->id)),
            ],
            'name_ur' => ['nullable', 'string', 'max:150'],
            'status'  => ['required', 'boolean'],
        ]);

        Topic::create([
            'chapter_id' => $chapter->id,
            'name'       => $validated['name'],
            'name_ur'    => $validated['name_ur'] ?? null,
            'status'     => $validated['status'],
            'created_by' => auth()->id(),
        ]);

        return back()->with('success', 'Topic added successfully.');
    }

    public function update(Request $request, Subject $subject, Chapter $chapter, Topic $topic)
    {
        abort_if($chapter->subject_id !== $subject->id, 403);
        abort_if($topic->chapter_id !== $chapter->id, 403);

        $validated = $request->validate([
            'name'    => [
                'required', 'string', 'max:150',
                Rule::unique('topics')->where(fn ($q) => $q->where('chapter_id', $chapter->id))->ignore($topic->id),
            ],
            'name_ur' => ['nullable', 'string', 'max:150'],
            'status'  => ['required', 'boolean'],
        ]);

        $topic->update([
            'name'    => $validated['name'],
            'name_ur' => $validated['name_ur'] ?? null,
            'status'  => $validated['status'],
        ]);

        return back()->with('success', 'Topic updated successfully.');
    }

    public function destroy(Subject $subject, Chapter $chapter, Topic $topic)
    {
        abort_if($chapter->subject_id !== $subject->id, 403);
        abort_if($topic->chapter_id !== $chapter->id, 403);

        $topic->delete();

        return back()->with('success', 'Topic deleted.');
    }
}
