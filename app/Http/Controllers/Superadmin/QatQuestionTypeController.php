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
            'orGroups' => $rules->groups,
        ]);
    }

    public function update(Request $request, int $subject): RedirectResponse
    {
        abort_unless(DB::table('qat_subjects')->where('id', $subject)->exists(), 404);
        $data = $request->validate([
            'hidden_type_ids' => ['present', 'array'],
            'hidden_type_ids.*' => ['required', 'integer', 'distinct'],
            ...QatQuestionTypeRules::PAIR_RULES,
            'random_or_groups' => ['sometimes', 'array', 'list'],
            'random_or_groups.*' => ['array:type_ids'],
            'random_or_groups.*.type_ids' => ['required', 'array', 'list', 'min:2'],
            'random_or_groups.*.type_ids.*' => ['required', 'integer', 'distinct'],
        ]);
        $types = $this->types($subject)->keyBy('id');
        $typeIds = $types->keys()->all();
        $hidden = array_map('intval', $data['hidden_type_ids']);
        if (array_diff($hidden, $typeIds) !== []) {
            throw ValidationException::withMessages(['hidden_type_ids' => 'Some question types are no longer available for this subject.']);
        }
        $changes = ['hidden_type_ids' => $hidden];
        if (array_key_exists('or_pairs', $data) || array_key_exists('random_or_groups', $data)) {
            $pairs = (new QatQuestionTypeRules(null))->validatePairs($data['or_pairs'] ?? [], $typeIds, requireConfigured: false);
            $groups = [
                ...array_map(fn ($pair) => ['type_ids' => [$pair['type_id'], $pair['partner_id']], 'random_pick' => false], $pairs),
                ...array_map(fn ($group) => [...$group, 'random_pick' => true], $data['random_or_groups'] ?? QatQuestionTypeRules::forSubject($subject)->randomGroups),
            ];
            $changes['or_groups'] = $this->validateGroups($groups, $types, 'random_or_groups');
        }
        $this->saveRules($subject, $changes);

        return back()->with('success', 'QAT question type settings saved.');
    }

    public function updateGroups(Request $request, int $subject): RedirectResponse
    {
        abort_unless(DB::table('qat_subjects')->where('id', $subject)->exists(), 404);
        $data = $request->validate([
            'or_groups' => ['present', 'array', 'list'],
            'or_groups.*' => ['array:type_ids,random_pick'],
            'or_groups.*.random_pick' => ['required', 'boolean'],
            'or_groups.*.type_ids' => ['required', 'array', 'list', 'min:2'],
            'or_groups.*.type_ids.*' => ['required', 'integer', 'distinct'],
        ]);
        $groups = $this->validateGroups($data['or_groups'], $this->types($subject)->keyBy('id'), 'or_groups');
        $this->saveRules($subject, ['or_groups' => $groups]);

        return back()->with('success', 'QAT OR groups saved.');
    }

    private function validateGroups(array $groups, Collection $types, string $field): array
    {
        $used = [];
        $validated = [];
        foreach ($groups as $group) {
            $ids = array_map('intval', $group['type_ids']);
            $random = (bool) $group['random_pick'];
            $mixed = $types->only($ids)->pluck('is_objective')->unique()->count() !== 1;
            // Existing fixed pairs can mix types. Larger groups and random
            // picks share a slot in one section of the generated paper.
            if (array_diff($ids, $types->keys()->all()) !== [] || array_intersect($ids, $used) !== []
                || ($mixed && ($random || count($ids) !== 2))) {
                throw ValidationException::withMessages([
                    $field => 'Use available question types of the same kind. A question type can belong to one OR group.',
                ]);
            }
            $validated[] = ['type_ids' => $ids, 'random_pick' => $random];
            $used = [...$used, ...$ids];
        }

        return $validated;
    }

    private function saveRules(int $subject, array $changes): void
    {
        DB::transaction(function () use ($subject, $changes): void {
            $query = DB::table('qat_subjects')->where('id', $subject);
            $rules = json_decode($query->lockForUpdate()->value('question_type_rules') ?? '{}', true) ?: [];
            if (array_key_exists('or_groups', $changes)) {
                unset($rules['or_pairs'], $rules['random_or_groups']);
            }
            $query->update(['question_type_rules' => json_encode([...$rules, ...$changes], JSON_THROW_ON_ERROR)]);
        });
    }

    private function types(int $subject): Collection
    {
        return QatQuestionTypeRules::availableTypes($subject)
            ->map(fn ($row) => [
                'id' => (int) $row->id, 'name' => $row->name ?: 'Question type '.$row->id,
                'is_objective' => (bool) $row->is_objective,
            ]);
    }
}
