<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ClassSubject;
use App\Models\PaperLayoutAssignment;
use App\Models\Pattern;
use App\Models\QuestionType;
use App\Support\PaperLayouts\PaperLayoutRegistry;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PaperLayoutController extends Controller
{
    public function index()
    {
        $scopes = DB::table('pattern_classes')
            ->join('classes', 'classes.id', '=', 'pattern_classes.class_id')
            ->leftJoin('paper_layout_assignments', function ($join): void {
                $join->on('paper_layout_assignments.pattern_id', '=', 'pattern_classes.pattern_id')
                    ->on('paper_layout_assignments.class_id', '=', 'pattern_classes.class_id');
            })
            ->orderBy('classes.sort_order')
            ->orderBy('classes.id')
            ->get([
                'pattern_classes.pattern_id',
                'classes.id as class_id',
                'classes.name as class_name',
                'classes.status as class_status',
                'paper_layout_assignments.paper_layout',
            ])
            ->map(fn (object $row) => [
                'pattern_id' => (int) $row->pattern_id,
                'class_id' => (int) $row->class_id,
                'name' => $row->class_name,
                'status' => (int) $row->class_status,
                'paper_layout' => PaperLayoutRegistry::normalize($row->paper_layout),
            ]);

        $classesByPattern = $scopes->groupBy('pattern_id');
        $patterns = Pattern::query()
            ->ordered()
            ->get(['id', 'name', 'short_name', 'status'])
            ->map(fn (Pattern $pattern) => [
                'id' => $pattern->id,
                'name' => $pattern->name,
                'short_name' => $pattern->short_name,
                'status' => $pattern->status,
                'classes' => $classesByPattern->get($pattern->id, collect())
                    ->map(fn (array $scope) => [
                        'id' => $scope['class_id'],
                        'name' => $scope['name'],
                        'status' => $scope['status'],
                        'paper_layout' => $scope['paper_layout'],
                    ])
                    ->values(),
            ]);

        $assignedCounts = $scopes->countBy('paper_layout');
        $layouts = collect(PaperLayoutRegistry::all())
            ->map(fn (array $layout, string $key) => [
                'key' => $key,
                ...$layout,
                'patterns_count' => $assignedCounts->get($key, 0),
            ])
            ->values();

        return Inertia::render('superadmin/paper-layouts', [
            'layouts' => $layouts,
            'patterns' => $patterns,
        ]);
    }

    public function federalOrIndex(Request $request)
    {
        $federalSubjects = $this->federalSubjectScopes()
            ->with(['pattern:id,name', 'schoolClass:id,name'])
            ->join('subjects', 'subjects.id', '=', 'class_subjects.subject_id')
            ->orderBy('subjects.name_eng')
            ->get(['class_subjects.*', 'subjects.name_eng as name', 'subjects.name_ur as name_ur']);
        $selectedSubject = $federalSubjects->find($request->integer('federal_subject'));

        return Inertia::render('superadmin/federal-or-settings', [
            'federalSubjects' => $federalSubjects->map(fn (ClassSubject $subject) => [
                'id' => $subject->id,
                'patternId' => $subject->pattern_id,
                'patternName' => $subject->pattern->name,
                'classId' => $subject->class_id,
                'className' => $subject->schoolClass->name,
                'name' => $subject->name ?: $subject->name_ur,
            ])->values(),
            'federalOr' => $selectedSubject === null ? null : [
                'subjectId' => $selectedSubject->id,
                'questionTypes' => $this->federalQuestionTypes($selectedSubject)->orderBy('name')->get(['id', 'name', 'name_ur'])
                    ->map(fn (QuestionType $type) => ['id' => $type->id, 'name' => $type->name ?: $type->name_ur]),
                'singleQuestionTypeIds' => $selectedSubject->federal_single_question_type_ids ?? [],
            ],
        ]);
    }

    public function updateFederalOr(Request $request, ClassSubject $classSubject)
    {
        abort_unless($this->federalSubjectScopes()->where('class_subjects.id', $classSubject->id)->exists(), 404);

        $data = $request->validate([
            'single_question_type_ids' => ['present', 'array', 'list'],
            'single_question_type_ids.*' => ['required', 'integer', 'distinct'],
        ]);
        $singleIds = array_map('intval', $data['single_question_type_ids']);
        $allowedIds = $this->federalQuestionTypes($classSubject)->pluck('id')->all();

        if (array_diff($singleIds, $allowedIds) !== []) {
            throw ValidationException::withMessages([
                'single_question_type_ids' => 'Select subjective question types for this subject.',
            ]);
        }

        sort($singleIds);
        $previous = $classSubject->federal_single_question_type_ids ?? [];
        if ($previous !== $singleIds) {
            $classSubject->update(['federal_single_question_type_ids' => $singleIds ?: null]);
            AuditLog::record(
                model: $classSubject,
                event: AuditEvent::Updated,
                oldValues: ['federal_single_question_type_ids' => $previous],
                newValues: ['federal_single_question_type_ids' => $singleIds],
                notes: 'Federal OR pairing settings updated.',
            );
        }

        return redirect()->route('superadmin.paper-layouts.federal-or.index', ['federal_subject' => $classSubject->id])
            ->with('success', 'Federal OR settings saved successfully.');
    }

    private function federalSubjectScopes(): Builder
    {
        return ClassSubject::query()
            ->join('paper_layout_assignments', function ($join): void {
                $join->on('paper_layout_assignments.pattern_id', '=', 'class_subjects.pattern_id')
                    ->on('paper_layout_assignments.class_id', '=', 'class_subjects.class_id');
            })
            ->where('paper_layout_assignments.paper_layout', PaperLayoutRegistry::FEDERAL_BOARD)
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('custom_paper_layouts')
                    ->whereColumn('custom_paper_layouts.pattern_id', 'class_subjects.pattern_id')
                    ->whereColumn('custom_paper_layouts.class_id', 'class_subjects.class_id')
                    ->whereColumn('custom_paper_layouts.subject_id', 'class_subjects.subject_id')
                    ->where('custom_paper_layouts.is_active', true);
            });
    }

    private function federalQuestionTypes(ClassSubject $subject): Builder
    {
        $scope = $subject->only(['pattern_id', 'class_id', 'subject_id']);

        return QuestionType::query()
            ->where('is_objective', false)
            ->where('status', 1)
            ->where(function ($query) use ($scope): void {
                $query->whereIn('question_types.id', DB::table('question_type_orders')->where($scope)->select('question_type_id'))
                    ->orWhereIn('question_types.id', DB::table('questions')
                        ->join('chapters', 'chapters.id', '=', 'questions.chapter_id')
                        ->where('chapters.pattern_id', $scope['pattern_id'])
                        ->where('chapters.class_id', $scope['class_id'])
                        ->where('chapters.subject_id', $scope['subject_id'])
                        ->where('questions.status', 1)
                        ->select('questions.question_type_id'));
            });
    }

    public function updateAssignments(Request $request)
    {
        $validated = $request->validate([
            'assignments' => ['required', 'array'],
            'assignments.*.pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'assignments.*.class_id' => ['required', 'integer', 'exists:classes,id'],
            'assignments.*.paper_layout' => [
                'required',
                'string',
                Rule::in(PaperLayoutRegistry::keys()),
            ],
        ]);

        $existingScopes = DB::table('pattern_classes')
            ->get(['pattern_id', 'class_id'])
            ->map(fn (object $scope) => $scope->pattern_id.':'.$scope->class_id)
            ->sort()
            ->values();

        $submittedScopes = collect($validated['assignments'])
            ->map(fn (array $assignment) => ((int) $assignment['pattern_id']).':'.((int) $assignment['class_id']));

        if (
            $submittedScopes->unique()->count() !== $submittedScopes->count()
            || $submittedScopes->sort()->values()->all() !== $existingScopes->all()
        ) {
            throw ValidationException::withMessages([
                'assignments' => 'The pattern and class list has changed. Refresh the page and try again.',
            ]);
        }

        DB::transaction(function () use ($validated): void {
            foreach ($validated['assignments'] as $assignment) {
                $patternId = (int) $assignment['pattern_id'];
                $classId = (int) $assignment['class_id'];
                $nextLayout = PaperLayoutRegistry::normalize($assignment['paper_layout']);
                $existing = PaperLayoutAssignment::query()
                    ->where('pattern_id', $patternId)
                    ->where('class_id', $classId)
                    ->first();
                $previousLayout = PaperLayoutRegistry::normalize($existing?->paper_layout);

                if ($previousLayout === $nextLayout) {
                    continue;
                }

                if ($nextLayout === PaperLayoutRegistry::STANDARD) {
                    $existing?->delete();
                } else {
                    PaperLayoutAssignment::query()->updateOrCreate(
                        ['pattern_id' => $patternId, 'class_id' => $classId],
                        ['paper_layout' => $nextLayout],
                    );
                }

                AuditLog::record(
                    model: Pattern::query()->findOrFail($patternId),
                    event: AuditEvent::Updated,
                    oldValues: ['class_id' => $classId, 'paper_layout' => $previousLayout],
                    newValues: ['class_id' => $classId, 'paper_layout' => $nextLayout],
                    notes: 'Class paper layout assignment updated.',
                );
            }
        });

        return back()->with('success', 'Paper layout assignments saved successfully.');
    }
}
