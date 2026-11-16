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

class QatPaperSectionController extends Controller
{
    public function index(Request $request): Response
    {
        $scope = $request->validate([
            'catalogue_id' => ['nullable', 'integer'],
            'class_id' => ['nullable', 'integer'],
            'subject_id' => ['nullable', 'integer'],
        ]);
        $catalogue = (int) ($scope['catalogue_id'] ?? 0);
        $class = (int) ($scope['class_id'] ?? 0);
        $subjects = DB::table('qat_subjects')->where('qat_catalogue_id', $catalogue)
            ->where('qat_class_id', $class)->orderBy('subject_name')
            ->get(['id', 'subject_name as name', 'paper_section_layout']);
        $selected = $subjects->firstWhere('id', (int) ($scope['subject_id'] ?? 0));

        return Inertia::render('superadmin/qat-paper-sections', [
            'catalogues' => DB::table('qat_catalogues')->orderByDesc('academic_year')->get(['id', 'academic_year as name']),
            'classes' => DB::table('qat_classes')->where('qat_catalogue_id', $catalogue)->orderBy('name')->get(['id', 'name']),
            'subjects' => $subjects->map(fn ($subject) => ['id' => (int) $subject->id, 'name' => $subject->name]),
            'scope' => ['catalogue_id' => $catalogue, 'class_id' => $class, 'subject_id' => (int) ($selected->id ?? 0)],
            'types' => $selected ? $this->subjectiveTypes($selected->id) : [],
            'settings' => $selected?->paper_section_layout ? json_decode($selected->paper_section_layout, true) : null,
        ]);
    }

    public function update(Request $request, int $subject): RedirectResponse
    {
        abort_unless(DB::table('qat_subjects')->where('id', $subject)->exists(), 404);
        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
            'show_objective_section' => ['required', 'boolean'],
            'objective_label_en' => ['nullable', 'string', 'max:255'],
            'objective_label_ur' => ['nullable', 'string', 'max:255'],
            'groups' => ['present', 'array', 'list', 'max:100'],
            'groups.*' => ['array:label_en,label_ur,question_type_ids'],
            'groups.*.label_en' => ['nullable', 'string', 'max:255'],
            'groups.*.label_ur' => ['nullable', 'string', 'max:255'],
            'groups.*.question_type_ids' => ['required', 'array', 'list', 'min:1', 'max:100'],
            'groups.*.question_type_ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $types = $this->subjectiveTypes($subject)->pluck('id')->all();
        $groups = collect($data['groups'])->map(function (array $group, int $index) use ($types) {
            $ids = array_map('intval', $group['question_type_ids']);
            if (array_diff($ids, $types) !== []) {
                throw ValidationException::withMessages([
                    "groups.$index.question_type_ids" => 'Choose subjective question types from this QAT subject.',
                ]);
            }

            return [
                'label_en' => trim($group['label_en'] ?? '') ?: null,
                'label_ur' => trim($group['label_ur'] ?? '') ?: null,
                'question_type_ids' => $ids,
            ];
        })->all();

        DB::table('qat_subjects')->where('id', $subject)->update(['paper_section_layout' => json_encode([
            'is_active' => (bool) $data['is_active'],
            'show_objective_section' => (bool) $data['show_objective_section'],
            'objective_label_en' => trim($data['objective_label_en'] ?? '') ?: null,
            'objective_label_ur' => trim($data['objective_label_ur'] ?? '') ?: null,
            'groups' => $groups,
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)]);

        return back()->with('success', 'QAT paper sections saved.');
    }

    private function subjectiveTypes(int $subject): Collection
    {
        return QatQuestionTypeRules::availableTypes($subject)
            ->filter(fn ($type) => $type->name !== null && ! $type->is_objective)
            ->map(fn ($type) => ['id' => (int) $type->id, 'name' => $type->name])->values();
    }
}
