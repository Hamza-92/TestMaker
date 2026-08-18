<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Pattern;
use App\Models\QuestionType;
use App\Models\QuestionTypeOrGroup;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class QuestionTypePairingController extends Controller
{
    public function index(Request $request)
    {
        $scope = $this->requestedScope($request);

        return Inertia::render('superadmin/question-type-pairings', [
            'scopeCatalog' => $this->scopeCatalog(),
            'selectedScope' => $scope === null ? null : [
                'pattern_id' => $scope[0],
                'class_id' => $scope[1],
                'subject_id' => $scope[2],
            ],
            'questionTypes' => $scope === null ? [] : $this->questionTypeOptions(...$scope),
            'groups' => $scope === null ? [] : $this->groups(...$scope),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'question_type_ids' => ['required', 'array', 'min:2'],
            'question_type_ids.*' => ['required', 'integer', 'distinct', 'exists:question_types,id'],
        ]);

        $patternId = (int) $validated['pattern_id'];
        $classId = (int) $validated['class_id'];
        $subjectId = (int) $validated['subject_id'];
        $typeIds = array_values(array_unique(array_map('intval', $validated['question_type_ids'])));

        $this->validateScope($patternId, $classId, $subjectId);

        if (count($typeIds) < 2) {
            throw ValidationException::withMessages([
                'question_type_ids' => 'Choose at least two different subjective question types.',
            ]);
        }

        $availableIds = $this->scopedQuestionTypeQuery($patternId, $classId, $subjectId)
            ->pluck('id')
            ->map(fn ($id) => (int) $id);
        $unavailableId = collect($typeIds)->first(fn (int $id) => ! $availableIds->contains($id));

        if ($unavailableId !== null) {
            throw ValidationException::withMessages([
                'question_type_ids' => 'Every selected question type must be available in the selected scope.',
            ]);
        }

        $scope = [
            'pattern_id' => $patternId,
            'class_id' => $classId,
            'subject_id' => $subjectId,
        ];
        $signatureIds = $typeIds;
        sort($signatureIds);
        $signature = implode(':', $signatureIds);

        $group = QuestionTypeOrGroup::query()->firstOrCreate(
            [...$scope, 'type_signature' => $signature],
            [
                'is_active' => true,
                'created_by' => $request->user()?->id,
            ],
        );

        if (! $group->wasRecentlyCreated) {
            throw ValidationException::withMessages([
                'question_type_ids' => 'This OR group already exists in the selected scope.',
            ]);
        }

        $group->members()->createMany(array_map(
            fn (int $typeId, int $index) => [
                'question_type_id' => $typeId,
                'sort_order' => $index,
            ],
            $typeIds,
            array_keys($typeIds),
        ));

        AuditLog::record(
            model: $group,
            event: AuditEvent::Created,
            newValues: $this->auditValues($group),
            notes: 'Question type OR group created.',
        );

        return back()->with('success', 'OR group created successfully.');
    }

    public function update(Request $request, QuestionTypeOrGroup $group)
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);
        $isActive = (bool) $validated['is_active'];

        if ($isActive) {
            $this->validateScope($group->pattern_id, $group->class_id, $group->subject_id);
            $memberIds = $group->members()->pluck('question_type_id');
            $availableIds = $this->scopedQuestionTypeQuery(
                $group->pattern_id,
                $group->class_id,
                $group->subject_id,
            )->whereIn('id', $memberIds)->pluck('id');

            if ($availableIds->count() !== $memberIds->count()) {
                throw ValidationException::withMessages([
                    'is_active' => 'This group cannot be activated because one or more types are no longer available in the scope.',
                ]);
            }
        }

        $oldValues = $this->auditValues($group);
        $group->update(['is_active' => $isActive]);

        AuditLog::record(
            model: $group,
            event: AuditEvent::Updated,
            oldValues: $oldValues,
            newValues: $this->auditValues($group),
            notes: $isActive ? 'Question type OR group activated.' : 'Question type OR group deactivated.',
        );

        return back()->with('success', $isActive ? 'OR group activated.' : 'OR group deactivated.');
    }

    public function destroy(QuestionTypeOrGroup $group)
    {
        AuditLog::record(
            model: $group,
            event: AuditEvent::Deleted,
            oldValues: $this->auditValues($group),
            notes: 'Question type OR group deleted.',
        );

        $group->delete();

        return back()->with('success', 'OR group removed successfully.');
    }

    private function scopeCatalog(): array
    {
        return [
            'patterns' => Pattern::query()
                ->where('status', 1)
                ->orderBy('name')
                ->get(['id', 'name', 'short_name']),
            'patternClasses' => DB::table('pattern_classes')
                ->join('patterns', 'patterns.id', '=', 'pattern_classes.pattern_id')
                ->join('classes', 'classes.id', '=', 'pattern_classes.class_id')
                ->where('patterns.status', 1)
                ->where('classes.status', 1)
                ->orderBy('patterns.name')
                ->orderBy('classes.name')
                ->get([
                    'pattern_classes.pattern_id',
                    'classes.id',
                    'classes.name',
                ]),
            'classSubjects' => DB::table('class_subjects')
                ->join('patterns', 'patterns.id', '=', 'class_subjects.pattern_id')
                ->join('subjects', 'subjects.id', '=', 'class_subjects.subject_id')
                ->where('patterns.status', 1)
                ->where('subjects.status', 1)
                ->orderBy('patterns.name')
                ->orderBy('subjects.name_eng')
                ->get([
                    'class_subjects.pattern_id',
                    'class_subjects.class_id',
                    'class_subjects.subject_id',
                    'subjects.name_eng as name',
                ]),
        ];
    }

    private function requestedScope(Request $request): ?array
    {
        $patternId = (int) $request->query('pattern_id', 0);
        $classId = (int) $request->query('class_id', 0);
        $subjectId = (int) $request->query('subject_id', 0);

        if (
            $patternId < 1
            || $classId < 1
            || $subjectId < 1
            || ! $this->scopeExists($patternId, $classId, $subjectId)
        ) {
            return null;
        }

        return [$patternId, $classId, $subjectId];
    }

    private function validateScope(int $patternId, int $classId, int $subjectId): void
    {
        if (! $this->scopeExists($patternId, $classId, $subjectId)) {
            throw ValidationException::withMessages([
                'subject_id' => 'The selected pattern, class, and subject are not linked.',
            ]);
        }
    }

    private function scopeExists(int $patternId, int $classId, int $subjectId): bool
    {
        return DB::table('pattern_classes')
            ->where('pattern_id', $patternId)
            ->where('class_id', $classId)
            ->exists()
            && DB::table('class_subjects')
                ->where('pattern_id', $patternId)
                ->where('class_id', $classId)
                ->where('subject_id', $subjectId)
                ->exists();
    }

    private function scopedQuestionTypeQuery(int $patternId, int $classId, int $subjectId): Builder
    {
        return QuestionType::query()
            ->where('is_objective', false)
            ->where('status', 1)
            ->whereIn('question_types.id', DB::table('questions')
                ->join('chapters', 'chapters.id', '=', 'questions.chapter_id')
                ->where('questions.status', 1)
                ->where('chapters.pattern_id', $patternId)
                ->where('chapters.class_id', $classId)
                ->where('chapters.subject_id', $subjectId)
                ->select('questions.question_type_id'));
    }

    private function questionTypeOptions(int $patternId, int $classId, int $subjectId): array
    {
        return $this->scopedQuestionTypeQuery($patternId, $classId, $subjectId)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (QuestionType $questionType) => [
                'id' => $questionType->id,
                'name' => $questionType->name,
            ])
            ->values()
            ->all();
    }

    private function groups(int $patternId, int $classId, int $subjectId): array
    {
        $availableIds = $this->scopedQuestionTypeQuery($patternId, $classId, $subjectId)
            ->pluck('id')
            ->map(fn ($id) => (int) $id);

        return QuestionTypeOrGroup::query()
            ->with('members.questionType:id,name')
            ->where('pattern_id', $patternId)
            ->where('class_id', $classId)
            ->where('subject_id', $subjectId)
            ->orderByDesc('is_active')
            ->orderByDesc('id')
            ->get()
            ->map(fn (QuestionTypeOrGroup $group) => [
                'id' => $group->id,
                'question_types' => $group->members->map(fn ($member) => [
                    'id' => $member->question_type_id,
                    'name' => $member->questionType?->name ?? 'Unknown type',
                ])->values()->all(),
                'is_active' => $group->is_active,
                'is_available' => $group->members->every(
                    fn ($member) => $availableIds->contains($member->question_type_id),
                ),
            ])
            ->values()
            ->all();
    }

    private function auditValues(QuestionTypeOrGroup $group): array
    {
        return [
            'pattern_id' => $group->pattern_id,
            'class_id' => $group->class_id,
            'subject_id' => $group->subject_id,
            'question_type_ids' => $group->members()
                ->orderBy('sort_order')
                ->pluck('question_type_id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all(),
            'is_active' => $group->is_active,
        ];
    }
}