<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\CustomPaperLayout;
use App\Models\ESheetAnswerSpace;
use App\Models\PaperQuestionSection;
use App\Models\PaperQuestionSectionScope;
use App\Models\Pattern;
use App\Models\QuestionType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ESheetAnswerSpaceController extends Controller
{
    public function index(Request $request)
    {
        $patternId = $request->integer('pattern_id');
        $classId = $request->integer('class_id');
        $subjectId = $request->integer('subject_id');
        $selected = $this->scopeExists($patternId, $classId, $subjectId)
            ? compact('patternId', 'classId', 'subjectId')
            : null;

        $types = collect();
        $settings = collect();
        if ($selected !== null) {
            $types = $this->orderedTypes($patternId, $classId, $subjectId);
            $settings = ESheetAnswerSpace::query()
                ->where('pattern_id', $patternId)->where('class_id', $classId)
                ->where('subject_id', $subjectId)->get(['question_type_id', 'lines', 'page_break'])
                ->keyBy('question_type_id');
        }

        return Inertia::render('superadmin/e-sheet-answer-spaces', [
            'scopeCatalog' => [
                'patterns' => Pattern::query()->where('status', 1)->ordered()->get(['id', 'name']),
                'patternClasses' => DB::table('pattern_classes')
                    ->join('classes', 'classes.id', '=', 'pattern_classes.class_id')
                    ->where('classes.status', 1)->orderBy('classes.sort_order')
                    ->get(['pattern_classes.pattern_id', 'classes.id', 'classes.name']),
                'classSubjects' => DB::table('class_subjects')
                    ->join('subjects', 'subjects.id', '=', 'class_subjects.subject_id')
                    ->where('subjects.status', 1)->orderBy('subjects.name_eng')
                    ->get(['class_subjects.pattern_id', 'class_subjects.class_id', 'class_subjects.subject_id', 'subjects.name_eng as name']),
            ],
            'selectedScope' => $selected,
            'questionTypes' => $types->map(fn (QuestionType $type) => [
                'id' => $type->id,
                'name' => $type->name,
                'name_ur' => $type->name_ur,
                'lines' => $settings->get($type->id)?->lines ?? 10,
                'page_break' => $settings->get($type->id)?->page_break ?? false,
            ])->values(),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'settings' => ['required', 'array', 'min:1'],
            'settings.*.question_type_id' => ['required', 'integer', 'distinct', 'exists:question_types,id'],
            'settings.*.lines' => ['required', 'integer', 'between:1,30'],
            'settings.*.page_break' => ['sometimes', 'boolean'],
        ]);
        $patternId = (int) $data['pattern_id'];
        $classId = (int) $data['class_id'];
        $subjectId = (int) $data['subject_id'];
        $typeIds = collect($data['settings'])->pluck('question_type_id')->map(fn ($id) => (int) $id);

        if (! $this->scopeExists($patternId, $classId, $subjectId)
            || $this->typesInScope($patternId, $classId, $subjectId)
                ->whereIn('id', $typeIds)->count() !== $typeIds->count()) {
            throw ValidationException::withMessages(['settings' => 'Choose subjective types available in this subject.']);
        }

        DB::transaction(function () use ($data, $patternId, $classId, $subjectId): void {
            foreach ($data['settings'] as $setting) {
                ESheetAnswerSpace::query()->updateOrCreate([
                    'pattern_id' => $patternId,
                    'class_id' => $classId,
                    'subject_id' => $subjectId,
                    'question_type_id' => $setting['question_type_id'],
                ], [
                    'lines' => $setting['lines'],
                    ...array_intersect_key($setting, ['page_break' => true]),
                ]);
            }
        });

        return back()->with('success', 'E-Sheet answer spaces saved.');
    }

    private function orderedTypes(int $patternId, int $classId, int $subjectId)
    {
        $scope = ['pattern_id' => $patternId, 'class_id' => $classId, 'subject_id' => $subjectId];
        $orders = DB::table('question_type_orders')->where($scope)->pluck('sort_order', 'question_type_id');
        $layout = CustomPaperLayout::query()->where($scope)->where('is_active', true)->with('sections.items')->first();
        $groupOrder = [];

        if ($layout !== null) {
            foreach ($layout->sections as $sectionIndex => $section) {
                foreach ($section->items as $itemIndex => $item) {
                    $groupOrder[$item->question_type_id] = $sectionIndex;
                    $orders[$item->question_type_id] = $itemIndex;
                }
            }
        } elseif (PaperQuestionSectionScope::query()->where($scope)->where('is_active', true)->exists()) {
            $sections = PaperQuestionSection::query()->where($scope)->with('members')->orderBy('sort_order')->get();
            foreach ($sections as $sectionIndex => $section) {
                foreach ($section->members as $member) {
                    $groupOrder[$member->question_type_id] ??= $sectionIndex;
                }
            }
        }

        return $this->typesInScope($patternId, $classId, $subjectId)
            ->get(['id', 'name', 'name_ur'])
            ->sortBy(fn (QuestionType $type) => [
                $groupOrder[$type->id] ?? PHP_INT_MAX,
                $orders[$type->id] ?? PHP_INT_MAX,
                $type->id,
            ])->values();
    }

    private function typesInScope(int $patternId, int $classId, int $subjectId)
    {
        return QuestionType::query()->where('is_objective', false)->where('status', 1)
            ->whereIn('id', DB::table('questions')
                ->join('chapters', 'chapters.id', '=', 'questions.chapter_id')
                ->where('questions.status', 1)->where('chapters.status', 1)
                ->where('chapters.pattern_id', $patternId)->where('chapters.class_id', $classId)
                ->where('chapters.subject_id', $subjectId)->select('questions.question_type_id'));
    }

    private function scopeExists(int $patternId, int $classId, int $subjectId): bool
    {
        return $patternId > 0 && $classId > 0 && $subjectId > 0
            && DB::table('class_subjects')->where('pattern_id', $patternId)
                ->where('class_id', $classId)->where('subject_id', $subjectId)->exists();
    }
}
