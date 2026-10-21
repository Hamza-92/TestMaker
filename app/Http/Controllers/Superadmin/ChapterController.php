<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\Pattern;
use App\Models\SchoolClass;
use App\Models\Subject;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ChapterController extends Controller
{
    public function store(Request $request, Subject $subject)
    {
        $scope = $request->validate([
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'pattern_id' => ['required', 'integer', 'exists:patterns,id'],
        ]);

        abort_unless(
            $subject->classSubjects()
                ->where('class_id', $scope['class_id'])
                ->where('pattern_id', $scope['pattern_id'])
                ->exists(),
            422,
            'This class–pattern combination is not linked to this subject.'
        );

        return $this->createChapter($request, $subject, (int) $scope['pattern_id'], (int) $scope['class_id']);
    }

    public function storeInQuestionScope(Request $request, Pattern $pattern, SchoolClass $schoolClass, Subject $subject): RedirectResponse
    {
        $linked = $subject->classSubjects()
            ->where('class_id', $schoolClass->id)
            ->where('pattern_id', $pattern->id)
            ->exists();
        $hasExistingChapter = Chapter::query()
            ->where('pattern_id', $pattern->id)
            ->where('class_id', $schoolClass->id)
            ->where('subject_id', $subject->id)
            ->exists();

        abort_unless($linked || $hasExistingChapter, 404);

        $request->merge(['status' => 1]);

        return $this->createChapter($request, $subject, $pattern->id, $schoolClass->id);
    }

    private function createChapter(Request $request, Subject $subject, int $patternId, int $classId): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'name_ur' => ['nullable', 'string', 'max:150'],
            'group_name' => ['nullable', 'string', 'max:300'],
            'group_heading' => ['nullable', 'string', 'max:150'],
            'chapter_number' => [
                'nullable', 'integer', 'min:1',
                Rule::unique('chapters')->where(fn ($q) => $q
                    ->where('subject_id', $subject->id)
                    ->where('class_id', $classId)
                    ->where('pattern_id', $patternId)
                ),
            ],
            'status' => ['required', 'boolean'],
        ]);

        Chapter::create([
            'subject_id' => $subject->id,
            'class_id' => $classId,
            'pattern_id' => $patternId,
            'name' => $validated['name'],
            'name_ur' => $validated['name_ur'] ?? null,
            'chapter_number' => $validated['chapter_number'] ?? null,
            'group_name' => $this->nullableString($validated['group_name'] ?? null),
            'group_heading' => $this->nullableString($validated['group_heading'] ?? null),
            'status' => $validated['status'],
            'created_by' => auth()->id(),
        ]);

        return back()->with('success', 'Chapter added successfully.');
    }

    public function update(Request $request, Subject $subject, Chapter $chapter)
    {
        abort_if($chapter->subject_id !== $subject->id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'name_ur' => ['nullable', 'string', 'max:150'],
            'group_name' => ['nullable', 'string', 'max:300'],
            'group_heading' => ['nullable', 'string', 'max:150'],
            'chapter_number' => [
                'nullable', 'integer', 'min:1',
                Rule::unique('chapters')->where(fn ($q) => $q
                    ->where('subject_id', $subject->id)
                    ->where('class_id', $chapter->class_id)
                    ->where('pattern_id', $chapter->pattern_id)
                )->ignore($chapter->id),
            ],
            'status' => ['required', 'boolean'],
        ]);

        $chapter->update([
            'name' => $validated['name'],
            'name_ur' => $validated['name_ur'] ?? null,
            'chapter_number' => $validated['chapter_number'] ?? null,
            'group_name' => $this->nullableString($validated['group_name'] ?? null),
            'group_heading' => $this->nullableString($validated['group_heading'] ?? null),
            'status' => $validated['status'],
        ]);

        return back()->with('success', 'Chapter updated successfully.');
    }

    public function destroy(Subject $subject, Chapter $chapter)
    {
        abort_if($chapter->subject_id !== $subject->id, 403);

        $chapter->delete();

        return back()->with('success', 'Chapter deleted.');
    }

    private function nullableString(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }
}
