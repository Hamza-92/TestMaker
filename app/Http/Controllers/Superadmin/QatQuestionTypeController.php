<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Support\Qat\QatQuestionTypeRules;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class QatQuestionTypeController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'catalogue_id' => ['nullable', 'integer'],
            'class_id' => ['nullable', 'integer'],
            'subject_id' => ['nullable', 'integer'],
        ]);
        $catalogue = (int) ($filters['catalogue_id'] ?? 0);
        $class = (int) ($filters['class_id'] ?? 0);
        $subject = (int) ($filters['subject_id'] ?? 0);
        $subjects = DB::table('qat_subjects')->where('qat_catalogue_id', $catalogue)
            ->where('qat_class_id', $class)->orderBy('subject_name')->get(['id', 'subject_name as name']);
        $selected = $subjects->contains('id', $subject);
        $rules = $selected ? QatQuestionTypeRules::forSubject($subject) : new QatQuestionTypeRules(null);
        $types = $selected ? $this->types($subject) : collect();
        $typeIds = $types->pluck('id')->all();

        return Inertia::render('superadmin/qat-question-types', [
            'catalogues' => DB::table('qat_catalogues')->orderByDesc('academic_year')->get(['id', 'academic_year as name']),
            'classes' => DB::table('qat_classes')->where('qat_catalogue_id', $catalogue)->orderBy('name')->get(['id', 'name']),
            'subjects' => $subjects,
            'scope' => ['catalogue_id' => $catalogue, 'class_id' => $class, 'subject_id' => $selected ? $subject : 0],
            'types' => $types,
            'hiddenTypeIds' => array_values(array_intersect($rules->hiddenTypeIds, $typeIds)),
            'pairs' => array_values(array_filter($rules->pairs, fn ($pair) => in_array($pair['type_id'], $typeIds, true) && in_array($pair['partner_id'], $typeIds, true))),
        ]);
    }

    public function update(Request $request, int $subject): RedirectResponse
    {
        abort_unless(DB::table('qat_subjects')->where('id', $subject)->exists(), 404);
        $data = $request->validate([
            'hidden_type_ids' => ['present', 'array'],
            'hidden_type_ids.*' => ['required', 'integer', 'distinct'],
            ...QatQuestionTypeRules::PAIR_RULES,
        ]);
        $typeIds = $this->types($subject)->pluck('id')->all();
        $hidden = array_map('intval', $data['hidden_type_ids']);
        if (array_diff($hidden, $typeIds) !== []) {
            throw ValidationException::withMessages(['hidden_type_ids' => 'Some question types are no longer available for this subject.']);
        }
        $pairs = (new QatQuestionTypeRules(null))->validatePairs($data['or_pairs'] ?? [], $typeIds, requireConfigured: false);
        $rules = ['hidden_type_ids' => $hidden, 'or_pairs' => $pairs];
        DB::table('qat_subjects')->where('id', $subject)->update(['question_type_rules' => json_encode($rules)]);

        return back()->with('success', 'QAT question type settings saved.');
    }

    private function types(int $subject): Collection
    {
        $questions = DB::table('qat_questions as question')
            ->join('qat_chapters as chapter', 'chapter.id', '=', 'question.qat_chapter_id')
            ->where('chapter.qat_subject_id', $subject);
        $base = (clone $questions)->select('question.question_type_id');
        $monthly = $questions->join('qat_month_edits as edit', 'edit.record_id', '=', 'question.id')
            ->where('edit.kind', 'question')->whereNotNull('edit.question_type_id')->select('edit.question_type_id');
        $available = DB::query()->fromSub($base->union($monthly), 'available');

        return $available->leftJoin('question_types as type', 'type.id', '=', 'available.question_type_id')
            ->orderByDesc('type.is_objective')->orderBy('type.name')->orderBy('available.question_type_id')
            ->get(['available.question_type_id as id', 'type.name'])
            ->map(fn ($row) => ['id' => (int) $row->id, 'name' => $row->name ?: 'Question type '.$row->id]);
    }
}
