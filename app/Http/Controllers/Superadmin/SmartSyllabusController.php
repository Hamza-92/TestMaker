<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\Pattern;
use App\Support\SmartSyllabus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SmartSyllabusController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('superadmin/smart-syllabus', [
            'initialScope' => [
                'patternId' => $request->integer('pattern_id') ?: null,
                'classId' => $request->integer('class_id') ?: null,
                'subjectId' => $request->integer('subject_id') ?: null,
            ],
            'scopeCatalog' => [
                'patterns' => Pattern::query()->where('status', 1)->ordered()->get(['id', 'name']),
                'patternClasses' => DB::table('pattern_classes')
                    ->join('classes', 'classes.id', '=', 'pattern_classes.class_id')
                    ->where('classes.status', 1)
                    ->orderBy('classes.sort_order')
                    ->orderBy('classes.id')
                    ->get(['pattern_classes.pattern_id', 'classes.id', 'classes.name']),
                'classSubjects' => DB::table('class_subjects')
                    ->join('subjects', 'subjects.id', '=', 'class_subjects.subject_id')
                    ->where('subjects.status', 1)
                    ->orderBy('subjects.name_eng')
                    ->get([
                        'class_subjects.pattern_id',
                        'class_subjects.class_id',
                        'class_subjects.subject_id',
                        'subjects.name_eng as name',
                        'subjects.name_ur',
                    ]),
            ],
        ]);
    }

    public function chapters(Request $request): JsonResponse
    {
        [$patternId, $classId, $subjectId] = $this->validatedScope($request);
        $excluded = SmartSyllabus::excludedForScope($patternId, $classId, $subjectId);

        $chapters = Chapter::query()
            ->where('pattern_id', $patternId)
            ->where('class_id', $classId)
            ->where('subject_id', $subjectId)
            ->where('status', 1)
            ->with(['topics' => fn ($query) => $query
                ->where('status', 1)
                ->orderBy('sort_id')
                ->orderBy('id')
                ->select('id', 'chapter_id', 'name', 'name_ur')])
            ->orderBy('chapter_number')
            ->orderBy('sort_id')
            ->orderBy('id')
            ->get(['id', 'name', 'name_ur', 'chapter_number'])
            ->map(fn (Chapter $chapter) => [
                'id' => $chapter->id,
                'name' => $chapter->name,
                'name_ur' => $chapter->name_ur,
                'chapter_number' => $chapter->chapter_number,
                'topics' => $chapter->topics->map(fn ($topic) => [
                    'id' => $topic->id,
                    'name' => $topic->name,
                    'name_ur' => $topic->name_ur,
                ])->values(),
            ])->values();

        return response()->json([
            'chapters' => $chapters,
            'excludedChapterIds' => $excluded['chapters'],
            'excludedTopicIds' => $excluded['topics'],
        ])->header('Cache-Control', 'no-store');
    }

    public function update(Request $request): RedirectResponse
    {
        [$patternId, $classId, $subjectId] = $this->validatedScope($request);
        $data = $request->validate([
            'excluded_chapter_ids' => ['present', 'array'],
            'excluded_chapter_ids.*' => ['required', 'integer', 'distinct'],
            'excluded_topic_ids' => ['present', 'array'],
            'excluded_topic_ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $chapterIds = Chapter::query()->where('pattern_id', $patternId)
            ->where('class_id', $classId)->where('subject_id', $subjectId)
            ->where('status', 1)->pluck('id')->map(fn ($id) => (int) $id)->all();
        $topicRows = DB::table('topics')->join('chapters', 'chapters.id', '=', 'topics.chapter_id')
            ->where('chapters.pattern_id', $patternId)
            ->where('chapters.class_id', $classId)
            ->where('chapters.subject_id', $subjectId)
            ->where('chapters.status', 1)
            ->where('topics.status', 1)
            ->get(['topics.id', 'topics.chapter_id']);
        $topicChapterIds = $topicRows->pluck('chapter_id', 'id');

        $excludedChapters = array_map('intval', $data['excluded_chapter_ids']);
        $excludedTopics = array_map('intval', $data['excluded_topic_ids']);
        if (array_diff($excludedChapters, $chapterIds) !== []) {
            throw ValidationException::withMessages(['excluded_chapter_ids' => 'Select chapters within this subject.']);
        }
        if (array_diff($excludedTopics, $topicChapterIds->keys()->map(fn ($id) => (int) $id)->all()) !== []) {
            throw ValidationException::withMessages(['excluded_topic_ids' => 'Select topics within this subject.']);
        }

        $excludedTopics = array_values(array_filter(
            $excludedTopics,
            fn (int $id): bool => ! in_array((int) $topicChapterIds->get($id), $excludedChapters, true),
        ));

        DB::transaction(function () use ($chapterIds, $topicChapterIds, $excludedChapters, $excludedTopics): void {
            DB::table('smart_syllabus_excluded_chapters')->whereIn('chapter_id', $chapterIds)->delete();
            DB::table('smart_syllabus_excluded_topics')->whereIn('topic_id', $topicChapterIds->keys())->delete();

            if ($excludedChapters !== []) {
                DB::table('smart_syllabus_excluded_chapters')->insert(
                    array_map(fn (int $id): array => ['chapter_id' => $id], $excludedChapters),
                );
            }
            if ($excludedTopics !== []) {
                DB::table('smart_syllabus_excluded_topics')->insert(
                    array_map(fn (int $id): array => ['topic_id' => $id], $excludedTopics),
                );
            }
        });

        return back()->with('success', 'Smart syllabus saved.');
    }

    /** @return array{int, int, int} */
    private function validatedScope(Request $request): array
    {
        $scope = $request->validate([
            'pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
        ]);
        $patternId = (int) $scope['pattern_id'];
        $classId = (int) $scope['class_id'];
        $subjectId = (int) $scope['subject_id'];
        if (! DB::table('class_subjects')->where('pattern_id', $patternId)
            ->where('class_id', $classId)->where('subject_id', $subjectId)->exists()) {
            throw ValidationException::withMessages(['subject_id' => 'Select a subject in this pattern and class.']);
        }

        return [$patternId, $classId, $subjectId];
    }
}
