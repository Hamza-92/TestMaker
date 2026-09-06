<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\PaperQuestionSection;
use App\Models\PaperQuestionSectionScope;
use App\Models\Pattern;
use App\Models\QuestionType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PaperQuestionSectionController extends Controller
{
    public function index(Request $request)
    {
        $scope = $this->requestedScope($request);

        return Inertia::render('superadmin/paper-question-sections', [
            'scopeCatalog' => $this->scopeCatalog(),
            'selectedScope' => $scope === null ? null : [
                'pattern_id' => $scope[0],
                'class_id' => $scope[1],
                'subject_id' => $scope[2],
            ],
            'questionTypes' => $scope === null ? [] : $this->questionTypes(...$scope),
            'sections' => $scope === null ? [] : $this->sections(...$scope),
            'sectioningActive' => $scope !== null && PaperQuestionSectionScope::query()
                ->where('pattern_id', $scope[0])
                ->where('class_id', $scope[1])
                ->where('subject_id', $scope[2])
                ->where('is_active', true)
                ->exists(),
        ]);
    }

    public function updateScope(Request $request)
    {
        $validated = $request->validate([
            'pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'is_active' => ['required', 'boolean'],
        ]);
        $patternId = (int) $validated['pattern_id'];
        $classId = (int) $validated['class_id'];
        $subjectId = (int) $validated['subject_id'];

        if (! $this->scopeExists($patternId, $classId, $subjectId)) {
            throw ValidationException::withMessages(['subject_id' => 'The selected scope is not linked.']);
        }

        PaperQuestionSectionScope::query()->updateOrCreate(
            ['pattern_id' => $patternId, 'class_id' => $classId, 'subject_id' => $subjectId],
            ['is_active' => (bool) $validated['is_active'], 'updated_by' => $request->user()?->id],
        );

        return back()->with('success', $validated['is_active'] ? 'Paper sections activated.' : 'Paper sections deactivated.');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'question_type_ids' => ['required', 'array', 'min:1'],
            'question_type_ids.*' => ['required', 'integer', 'distinct', 'exists:question_types,id'],
        ]);
        $patternId = (int) $validated['pattern_id'];
        $classId = (int) $validated['class_id'];
        $subjectId = (int) $validated['subject_id'];
        $typeIds = array_values(array_unique(array_map('intval', $validated['question_type_ids'])));

        $this->validateSelection($patternId, $classId, $subjectId, $typeIds);

        DB::transaction(function () use ($request, $patternId, $classId, $subjectId, $typeIds): void {
            $nextOrder = ((int) PaperQuestionSection::query()
                ->where('pattern_id', $patternId)
                ->where('class_id', $classId)
                ->where('subject_id', $subjectId)
                ->lockForUpdate()
                ->max('sort_order')) + 1;
            $section = PaperQuestionSection::create([
                'pattern_id' => $patternId,
                'class_id' => $classId,
                'subject_id' => $subjectId,
                'sort_order' => max(2, $nextOrder),
                'created_by' => $request->user()?->id,
            ]);
            $this->replaceMembers($section, $typeIds);
        });

        return back()->with('success', 'Paper section created successfully.');
    }

    public function update(Request $request, PaperQuestionSection $section)
    {
        $validated = $request->validate([
            'question_type_ids' => ['required', 'array', 'min:1'],
            'question_type_ids.*' => ['required', 'integer', 'distinct', 'exists:question_types,id'],
        ]);
        $typeIds = array_values(array_unique(array_map('intval', $validated['question_type_ids'])));

        $this->validateSelection($section->pattern_id, $section->class_id, $section->subject_id, $typeIds, $section->id);
        DB::transaction(fn () => $this->replaceMembers($section, $typeIds));

        return back()->with('success', 'Paper section updated successfully.');
    }

    public function destroy(PaperQuestionSection $section)
    {
        DB::transaction(function () use ($section): void {
            $scope = [$section->pattern_id, $section->class_id, $section->subject_id];
            $removedOrder = $section->sort_order;
            $section->delete();
            PaperQuestionSection::query()
                ->where('pattern_id', $scope[0])
                ->where('class_id', $scope[1])
                ->where('subject_id', $scope[2])
                ->where('sort_order', '>', $removedOrder)
                ->decrement('sort_order');
        });

        return back()->with('success', 'Paper section removed successfully.');
    }

    private function validateSelection(int $patternId, int $classId, int $subjectId, array $typeIds, ?int $exceptSectionId = null): void
    {
        if (! $this->scopeExists($patternId, $classId, $subjectId)) {
            throw ValidationException::withMessages(['subject_id' => 'The selected scope is not linked.']);
        }

        $availableIds = $this->subjectiveTypeQuery($patternId, $classId, $subjectId)->pluck('id')->map(fn ($id) => (int) $id);
        if (collect($typeIds)->contains(fn (int $id) => ! $availableIds->contains($id))) {
            throw ValidationException::withMessages(['question_type_ids' => 'Every type must be an available subjective type in this scope.']);
        }

        $assigned = DB::table('paper_question_section_members as members')
            ->join('paper_question_sections as sections', 'sections.id', '=', 'members.section_id')
            ->where('sections.pattern_id', $patternId)
            ->where('sections.class_id', $classId)
            ->where('sections.subject_id', $subjectId)
            ->when($exceptSectionId, fn ($query) => $query->where('sections.id', '!=', $exceptSectionId))
            ->whereIn('members.question_type_id', $typeIds)
            ->exists();

        if ($assigned) {
            throw ValidationException::withMessages(['question_type_ids' => 'A selected type already belongs to another paper section.']);
        }
    }

    private function replaceMembers(PaperQuestionSection $section, array $typeIds): void
    {
        $section->members()->delete();
        $section->members()->createMany(array_map(fn (int $id, int $index) => [
            'question_type_id' => $id,
            'sort_order' => $index,
        ], $typeIds, array_keys($typeIds)));
    }

    private function sections(int $patternId, int $classId, int $subjectId): array
    {
        return PaperQuestionSection::query()->with('members.questionType:id,name')
            ->where('pattern_id', $patternId)->where('class_id', $classId)->where('subject_id', $subjectId)
            ->orderBy('sort_order')->get()->map(fn (PaperQuestionSection $section) => [
                'id' => $section->id,
                'sort_order' => $section->sort_order,
                'question_types' => $section->members->map(fn ($member) => [
                    'id' => $member->question_type_id,
                    'name' => $member->questionType?->name ?? 'Unknown type',
                ])->values()->all(),
            ])->values()->all();
    }

    private function questionTypes(int $patternId, int $classId, int $subjectId): array
    {
        return $this->subjectiveTypeQuery($patternId, $classId, $subjectId)->orderBy('name')->get(['id', 'name'])->toArray();
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
