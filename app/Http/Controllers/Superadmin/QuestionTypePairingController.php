<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Pattern;
use App\Models\QuestionType;
use App\Models\QuestionTypePairing;
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
            'pairings' => $scope === null ? [] : $this->pairings(...$scope),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'question_type_a_id' => ['required', 'integer', 'exists:question_types,id'],
            'question_type_b_id' => ['required', 'integer', 'exists:question_types,id'],
        ]);

        $patternId = (int) $validated['pattern_id'];
        $classId = (int) $validated['class_id'];
        $subjectId = (int) $validated['subject_id'];
        $firstTypeId = (int) $validated['question_type_a_id'];
        $secondTypeId = (int) $validated['question_type_b_id'];

        $this->validateScope($patternId, $classId, $subjectId);

        if ($firstTypeId === $secondTypeId) {
            throw ValidationException::withMessages([
                'question_type_b_id' => 'Choose two different subjective question types.',
            ]);
        }

        $availableIds = $this->scopedQuestionTypeQuery($patternId, $classId, $subjectId)
            ->pluck('id')
            ->map(fn ($id) => (int) $id);

        if (! $availableIds->contains($firstTypeId)) {
            throw ValidationException::withMessages([
                'question_type_a_id' => 'The first question type is not available in the selected scope.',
            ]);
        }

        if (! $availableIds->contains($secondTypeId)) {
            throw ValidationException::withMessages([
                'question_type_b_id' => 'The second question type is not available in the selected scope.',
            ]);
        }

        [$typeAId, $typeBId] = $this->normalizePair($firstTypeId, $secondTypeId);
        $scope = [
            'pattern_id' => $patternId,
            'class_id' => $classId,
            'subject_id' => $subjectId,
        ];

        $pairing = QuestionTypePairing::query()->firstOrCreate(
            [
                ...$scope,
                'question_type_a_id' => $typeAId,
                'question_type_b_id' => $typeBId,
            ],
            [
                'is_active' => true,
                'created_by' => $request->user()?->id,
            ],
        );

        if (! $pairing->wasRecentlyCreated) {
            throw ValidationException::withMessages([
                'question_type_b_id' => 'This OR pairing already exists in the selected scope.',
            ]);
        }
        AuditLog::record(
            model: $pairing,
            event: AuditEvent::Created,
            newValues: $this->auditValues($pairing),
            notes: 'Question type OR pairing created.',
        );

        return back()->with('success', 'OR pairing created successfully.');
    }

    public function update(Request $request, QuestionTypePairing $pairing)
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);
        $isActive = (bool) $validated['is_active'];

        if ($isActive) {
            $this->validateScope($pairing->pattern_id, $pairing->class_id, $pairing->subject_id);
            $availableIds = $this->scopedQuestionTypeQuery(
                $pairing->pattern_id,
                $pairing->class_id,
                $pairing->subject_id,
            )
                ->whereIn('id', [$pairing->question_type_a_id, $pairing->question_type_b_id])
                ->pluck('id');

            if ($availableIds->count() !== 2) {
                throw ValidationException::withMessages([
                    'is_active' => 'This pairing cannot be activated because one or both types are no longer available in the scope.',
                ]);
            }
        }

        $oldValues = $this->auditValues($pairing);
        $pairing->update(['is_active' => $isActive]);

        AuditLog::record(
            model: $pairing,
            event: AuditEvent::Updated,
            oldValues: $oldValues,
            newValues: $this->auditValues($pairing),
            notes: $isActive
                ? 'Question type OR pairing activated.'
                : 'Question type OR pairing deactivated.',
        );

        return back()->with('success', $isActive ? 'OR pairing activated.' : 'OR pairing deactivated.');
    }

    public function destroy(QuestionTypePairing $pairing)
    {
        AuditLog::record(
            model: $pairing,
            event: AuditEvent::Deleted,
            oldValues: $this->auditValues($pairing),
            notes: 'Question type OR pairing deleted.',
        );

        $pairing->delete();

        return back()->with('success', 'OR pairing removed successfully.');
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

    private function pairings(int $patternId, int $classId, int $subjectId): array
    {
        $availableIds = $this->scopedQuestionTypeQuery($patternId, $classId, $subjectId)
            ->pluck('id')
            ->map(fn ($id) => (int) $id);

        return QuestionTypePairing::query()
            ->with([
                'questionTypeA:id,name',
                'questionTypeB:id,name',
            ])
            ->where('pattern_id', $patternId)
            ->where('class_id', $classId)
            ->where('subject_id', $subjectId)
            ->orderByDesc('is_active')
            ->orderByDesc('id')
            ->get()
            ->map(fn (QuestionTypePairing $pairing) => [
                'id' => $pairing->id,
                'question_type_a' => $pairing->questionTypeA,
                'question_type_b' => $pairing->questionTypeB,
                'is_active' => $pairing->is_active,
                'is_available' => $availableIds->contains($pairing->question_type_a_id)
                    && $availableIds->contains($pairing->question_type_b_id),
            ])
            ->values()
            ->all();
    }

    private function normalizePair(int $firstTypeId, int $secondTypeId): array
    {
        return $firstTypeId < $secondTypeId
            ? [$firstTypeId, $secondTypeId]
            : [$secondTypeId, $firstTypeId];
    }

    private function auditValues(QuestionTypePairing $pairing): array
    {
        return [
            'pattern_id' => $pairing->pattern_id,
            'class_id' => $pairing->class_id,
            'subject_id' => $pairing->subject_id,
            'question_type_a_id' => $pairing->question_type_a_id,
            'question_type_b_id' => $pairing->question_type_b_id,
            'is_active' => $pairing->is_active,
        ];
    }
}
