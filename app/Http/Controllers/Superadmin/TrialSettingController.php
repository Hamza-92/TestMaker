<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\Pattern;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\TrialSetting;
use App\Support\SubscriptionAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class TrialSettingController extends Controller
{
    public function index()
    {
        $resources = $this->accessResources();

        return Inertia::render('superadmin/trial-settings', [
            'settings' => TrialSetting::current(),
            'patterns' => $resources['patterns'],
            'classes' => $resources['classes'],
            'subjects' => $resources['subjects'],
            'patternClassMap' => $resources['patternClassMap'],
            'classSubjectMap' => $resources['classSubjectMap'],
        ]);
    }

    public function update(Request $request)
    {
        $resources = $this->accessResources();

        $data = $request->validate([
            'trial_duration_days' => ['required', 'integer', 'min:1', 'max:365'],
            'allow_subjective_answers' => ['boolean'],
            'access_scope' => ['nullable', 'array'],
            'chapter_access' => ['nullable', 'array'],
            'chapter_access.*' => ['array'],
            'chapter_access.*.*' => ['integer', 'distinct'],
            'topic_access' => ['nullable', 'array'],
            'topic_access.*' => ['array'],
            'topic_access.*.*' => ['integer', 'distinct'],
        ]);

        $accessScope = SubscriptionAccess::normalizeScope($data['access_scope'] ?? null, $resources);
        $chapterAccess = $this->validatedContentRules($data['chapter_access'] ?? [], 'chapter_access');
        $topicAccess = $this->validatedContentRules($data['topic_access'] ?? [], 'topic_access', $chapterAccess);

        TrialSetting::current()->update([
            'trial_duration_days' => $data['trial_duration_days'],
            'allow_subjective_answers' => $data['allow_subjective_answers'] ?? false,
            'access_scope' => $accessScope,
            'chapter_access' => $chapterAccess,
            'topic_access' => $topicAccess,
        ]);

        return back()->with('success', 'Trial settings saved.');
    }

    public function chapters(Request $request)
    {
        $data = $request->validate([
            'pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
        ]);

        $chapters = Chapter::query()
            ->where('pattern_id', $data['pattern_id'])
            ->where('class_id', $data['class_id'])
            ->where('subject_id', $data['subject_id'])
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

        return response()->json(['chapters' => $chapters]);
    }

    private function validatedContentRules(array $rules, string $field, array $chapterRules = []): array
    {
        $normalized = [];

        foreach ($rules as $key => $ids) {
            if (! is_string($key) || ! preg_match('/^(\d+):(\d+):(\d+)$/', $key, $matches)) {
                throw ValidationException::withMessages([$field => 'Select a valid pattern, class, and subject.']);
            }

            [$patternId, $classId, $subjectId] = array_map('intval', array_slice($matches, 1));
            $canonicalKey = "{$patternId}:{$classId}:{$subjectId}";
            if ($key !== $canonicalKey || ! DB::table('class_subjects')
                ->where('pattern_id', $patternId)
                ->where('class_id', $classId)
                ->where('subject_id', $subjectId)
                ->exists()) {
                throw ValidationException::withMessages([$field => 'Select an assigned subject.']);
            }

            $ids = array_values(array_unique(array_map('intval', $ids)));
            sort($ids, SORT_NUMERIC);
            $query = $field === 'chapter_access'
                ? DB::table('chapters')->whereIn('id', $ids)->where('status', 1)
                : DB::table('topics')
                    ->join('chapters', 'chapters.id', '=', 'topics.chapter_id')
                    ->whereIn('topics.id', $ids)
                    ->where('topics.status', 1)
                    ->where('chapters.status', 1)
                    ->when(isset($chapterRules[$key]), fn ($query) => $query->whereIn('chapters.id', $chapterRules[$key]));
            $query->where('chapters.pattern_id', $patternId)
                ->where('chapters.class_id', $classId)
                ->where('chapters.subject_id', $subjectId);

            if ($query->count() !== count($ids)) {
                throw ValidationException::withMessages([$field => 'Select only active content within this subject.']);
            }

            $normalized[$key] = $ids;
        }

        return $normalized;
    }

    private function accessResources(): array
    {
        return [
            'patterns' => Pattern::where('status', 1)->ordered()->get(['id', 'name', 'short_name']),
            'classes' => SchoolClass::where('status', 1)->ordered()->get(['id', 'name']),
            'subjects' => Subject::where('status', 1)->orderBy('name_eng')->get(['id', 'name_eng', 'name_ur']),
            ...SubscriptionAccess::buildMaps(),
        ];
    }
}
