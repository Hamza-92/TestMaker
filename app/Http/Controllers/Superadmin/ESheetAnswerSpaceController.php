<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\ESheetAnswerSpace;
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
            $types = $this->typesInScope($patternId, $classId, $subjectId)
                ->orderBy('name')->get(['id', 'name', 'name_ur']);
            $settings = ESheetAnswerSpace::query()
                ->where('pattern_id', $patternId)->where('class_id', $classId)
                ->where('subject_id', $subjectId)->get(['question_type_id', 'lines'])
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
                ], ['lines' => $setting['lines']]);
            }
        });

        return back()->with('success', 'E-Sheet answer spaces saved.');
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
