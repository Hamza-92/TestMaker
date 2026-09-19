<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\CustomPaperLayout;
use App\Models\MultipartQuestionSetting;
use App\Models\Pattern;
use App\Models\QuestionType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CustomPaperLayoutController extends Controller
{
    public function index(Request $request)
    {
        $scope = $this->requestedScope($request);
        $layout = $scope === null ? null : CustomPaperLayout::query()
            ->with('sections.items')
            ->where('pattern_id', $scope[0])
            ->where('class_id', $scope[1])
            ->where('subject_id', $scope[2])
            ->first();

        return Inertia::render('superadmin/custom-paper-layouts', [
            'scopeCatalog' => $this->scopeCatalog(),
            'selectedScope' => $scope === null ? null : [
                'pattern_id' => $scope[0],
                'class_id' => $scope[1],
                'subject_id' => $scope[2],
            ],
            'questionTypes' => $scope === null ? [] : $this->questionTypes(...$scope),
            'multipartTypeIds' => $scope === null ? [] : $this->multipartTypeIds(...$scope),
            'layout' => $layout === null ? null : [
                'id' => $layout->id,
                'is_active' => $layout->is_active,
                'sections' => $layout->sections->map(fn ($section) => [
                    'id' => $section->id,
                    'items' => $section->items->map(fn ($item) => [
                        'question_type_id' => $item->question_type_id,
                        'shared_number_group' => $item->shared_number_group,
                        'or_group' => $item->or_group,
                    ])->values()->all(),
                ])->values()->all(),
            ],
        ]);
    }

    public function save(Request $request)
    {
        $validated = $request->validate([
            'pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'is_active' => ['required', 'boolean'],
            'sections' => ['required', 'array', 'min:1', 'max:25'],
            'sections.*.items' => ['required', 'array', 'min:1'],
            'sections.*.items.*.question_type_id' => ['required', 'integer', 'exists:question_types,id'],
            'sections.*.items.*.shared_number_group' => ['nullable', 'integer', 'min:1'],
            'sections.*.items.*.or_group' => ['nullable', 'integer', 'min:1'],
        ]);
        $patternId = (int) $validated['pattern_id'];
        $classId = (int) $validated['class_id'];
        $subjectId = (int) $validated['subject_id'];

        if (! $this->scopeExists($patternId, $classId, $subjectId)) {
            throw ValidationException::withMessages(['subject_id' => 'The selected scope is not linked.']);
        }

        $items = collect($validated['sections'])->flatMap(
            fn (array $section, int $sectionIndex) => collect($section['items'])->map(
                fn (array $item) => [...$item, '_section_index' => $sectionIndex],
            ),
        );
        $typeIds = $items->pluck('question_type_id')->map(fn ($id) => (int) $id);
        if ($typeIds->duplicates()->isNotEmpty()) {
            throw ValidationException::withMessages(['sections' => 'Each question type can appear only once in a custom layout.']);
        }
        $availableIds = $this->subjectiveTypeQuery($patternId, $classId, $subjectId)->pluck('id')->map(fn ($id) => (int) $id);
        if ($typeIds->contains(fn (int $id) => ! $availableIds->contains($id))) {
            throw ValidationException::withMessages(['sections' => 'Every layout item must be an available subjective type in this scope.']);
        }
        if ((bool) $validated['is_active'] && $typeIds->sort()->values()->all() !== $availableIds->sort()->values()->all()) {
            throw ValidationException::withMessages(['sections' => 'Assign every available subjective type before activating this layout.']);
        }

        $multipartTypeIds = collect($this->multipartTypeIds($patternId, $classId, $subjectId))
            ->intersect($typeIds)
            ->values();
        if ($multipartTypeIds->isNotEmpty()) {
            $multipartSectionIndexes = collect($validated['sections'])
                ->keys()
                ->filter(fn (int $sectionIndex) => collect($validated['sections'][$sectionIndex]['items'])
                    ->contains(fn (array $item) => $multipartTypeIds->contains((int) $item['question_type_id'])));
            if ($multipartSectionIndexes->count() > 1) {
                throw ValidationException::withMessages(['sections' => 'All parts of the active multipart question must stay in the same section.']);
            }

            $groupedMultipartItem = $items->first(fn (array $item) => $multipartTypeIds->contains((int) $item['question_type_id'])
                && (($item['shared_number_group'] ?? null) !== null || ($item['or_group'] ?? null) !== null));
            if ($groupedMultipartItem !== null) {
                throw ValidationException::withMessages(['sections' => 'Multipart types already share their own question number and cannot join a custom shared or OR group.']);
            }
        }

        foreach ($items->whereNotNull('shared_number_group')->groupBy('shared_number_group') as $members) {
            if ($members->count() < 2) {
                throw ValidationException::withMessages(['sections' => 'A shared question number needs at least two question types.']);
            }
            if ($members->pluck('_section_index')->unique()->count() > 1) {
                throw ValidationException::withMessages(['sections' => 'Question types sharing a number must stay in the same section.']);
            }
        }
        foreach ($items->whereNotNull('or_group')->groupBy('or_group') as $members) {
            if ($members->count() < 2) {
                throw ValidationException::withMessages(['sections' => 'An OR group needs at least two question types.']);
            }
            if ($members->pluck('_section_index')->unique()->count() > 1) {
                throw ValidationException::withMessages(['sections' => 'Question types in an OR group must stay in the same section.']);
            }
            if ($members->pluck('shared_number_group')->unique()->count() > 1) {
                throw ValidationException::withMessages(['sections' => 'All members of an OR group must use the same shared question number.']);
            }
        }

        DB::transaction(function () use ($request, $validated, $patternId, $classId, $subjectId): void {
            $layout = CustomPaperLayout::query()->updateOrCreate(
                ['pattern_id' => $patternId, 'class_id' => $classId, 'subject_id' => $subjectId],
                ['is_active' => (bool) $validated['is_active'], 'updated_by' => $request->user()?->id],
            );
            $layout->sections()->delete();
            foreach ($validated['sections'] as $sectionIndex => $sectionData) {
                $section = $layout->sections()->create(['sort_order' => $sectionIndex + 2]);
                $section->items()->createMany(collect($sectionData['items'])->values()->map(
                    fn (array $item, int $itemIndex) => [
                        'question_type_id' => (int) $item['question_type_id'],
                        'sort_order' => $itemIndex,
                        'shared_number_group' => $item['shared_number_group'] ?? null,
                        'or_group' => $item['or_group'] ?? null,
                    ],
                )->all());
            }
        });

        return back()->with('success', 'Custom paper layout saved successfully.');
    }

    private function questionTypes(int $patternId, int $classId, int $subjectId): array
    {
        return $this->subjectiveTypeQuery($patternId, $classId, $subjectId)
            ->orderBy('name')->get(['id', 'name', 'name_ur'])->toArray();
    }

    private function multipartTypeIds(int $patternId, int $classId, int $subjectId): array
    {
        $setting = MultipartQuestionSetting::query()
            ->where('pattern_id', $patternId)
            ->where('class_id', $classId)
            ->where('subject_id', $subjectId)
            ->where('is_active', true)
            ->first();

        return collect($setting?->part_type_ids ?? [])->map(fn ($id) => (int) $id)->values()->all();
    }

    private function subjectiveTypeQuery(int $patternId, int $classId, int $subjectId): Builder
    {
        return QuestionType::query()->where('is_objective', false)->where('status', 1)
            ->whereIn('id', DB::table('questions')->join('chapters', 'chapters.id', '=', 'questions.chapter_id')
                ->where('questions.status', 1)->where('chapters.pattern_id', $patternId)
                ->where('chapters.class_id', $classId)->where('chapters.subject_id', $subjectId)
                ->select('questions.question_type_id'));
    }

    private function requestedScope(Request $request): ?array
    {
        $scope = [(int) $request->query('pattern_id'), (int) $request->query('class_id'), (int) $request->query('subject_id')];

        return min($scope) > 0 && $this->scopeExists(...$scope) ? $scope : null;
    }

    private function scopeExists(int $patternId, int $classId, int $subjectId): bool
    {
        return DB::table('class_subjects')->where('pattern_id', $patternId)->where('class_id', $classId)->where('subject_id', $subjectId)->exists();
    }

    private function scopeCatalog(): array
    {
        return [
            'patterns' => Pattern::query()->where('status', 1)->ordered()->get(['id', 'name']),
            'patternClasses' => DB::table('pattern_classes')->join('classes', 'classes.id', '=', 'pattern_classes.class_id')
                ->where('classes.status', 1)->orderBy('classes.sort_order')->orderBy('classes.id')->get(['pattern_classes.pattern_id', 'classes.id', 'classes.name']),
            'classSubjects' => DB::table('class_subjects')->join('subjects', 'subjects.id', '=', 'class_subjects.subject_id')
                ->where('subjects.status', 1)->orderBy('subjects.name_eng')->get(['class_subjects.pattern_id', 'class_subjects.class_id', 'class_subjects.subject_id', 'subjects.name_eng as name']),
        ];
    }
}
