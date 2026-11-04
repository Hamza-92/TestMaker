<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Pattern;
use App\Models\QuestionType;
use App\Models\SubjectiveColumnSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SubjectiveColumnSettingController extends Controller
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
            $types = $this->typesInScope($patternId, $classId, $subjectId)
                ->orderBy('name')->get(['id', 'name', 'name_ur']);
            $settings = SubjectiveColumnSetting::query()
                ->where('pattern_id', $patternId)->where('class_id', $classId)
                ->where('subject_id', $subjectId)->whereIn('question_type_id', $types->pluck('id'))
                ->get(['question_type_id', 'columns', 'apply_to_both'])->keyBy('question_type_id');
        }

        return Inertia::render('superadmin/subjective-column-settings', [
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
                'columns' => $settings->get($type->id)?->columns ?? 1,
                'apply_to_both' => $settings->get($type->id)?->apply_to_both ?? false,
            ])->values(),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'question_type_id' => ['required', 'integer', 'exists:question_types,id'],
            'columns' => ['required', 'integer', 'between:1,5'],
            'apply_to_both' => ['required', 'boolean'],
        ]);
        $patternId = (int) $data['pattern_id'];
        $classId = (int) $data['class_id'];
        $subjectId = (int) $data['subject_id'];
        if (! $this->scopeExists($patternId, $classId, $subjectId)
            || ! $this->typesInScope($patternId, $classId, $subjectId)
                ->whereKey($data['question_type_id'])->exists()) {
            throw ValidationException::withMessages(['question_type_id' => 'Choose a subjective type available in this subject.']);
        }

        SubjectiveColumnSetting::query()->updateOrCreate([
            'pattern_id' => $patternId,
            'class_id' => $classId,
            'subject_id' => $subjectId,
            'question_type_id' => $data['question_type_id'],
        ], [
            'columns' => $data['columns'],
            'apply_to_both' => $data['apply_to_both'],
        ]);

        return back()->with('success', 'Column setting saved.');
    }

    private function typesInScope(int $patternId, int $classId, int $subjectId)
    {
        return QuestionType::query()->where('is_objective', false)->where('status', 1)
            ->whereIn('id', DB::table('questions')
                ->join('chapters', 'chapters.id', '=', 'questions.chapter_id')
                ->where('questions.status', 1)->where('chapters.pattern_id', $patternId)
                ->where('chapters.class_id', $classId)->where('chapters.subject_id', $subjectId)
                ->select('questions.question_type_id'));
    }

    private function scopeExists(int $patternId, int $classId, int $subjectId): bool
    {
        return $patternId > 0 && $classId > 0 && $subjectId > 0
            && DB::table('class_subjects')->where('pattern_id', $patternId)
                ->where('class_id', $classId)->where('subject_id', $subjectId)->exists();
    }
}
