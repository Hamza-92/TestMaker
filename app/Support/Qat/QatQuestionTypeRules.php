<?php

namespace App\Support\Qat;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class QatQuestionTypeRules
{
    public const PAIR_RULES = [
        'or_pairs' => ['sometimes', 'array', 'max:100'],
        'or_pairs.*.type_id' => ['required', 'integer'],
        'or_pairs.*.partner_id' => ['required', 'integer'],
    ];

    public const AUTO_CHOICE_RULES = [
        'auto_or_choices' => ['sometimes', 'array', 'list', 'max:20'],
        'auto_or_choices.*' => ['array:question_type_id,variants'],
        'auto_or_choices.*.question_type_id' => ['required', 'integer', 'distinct'],
        'auto_or_choices.*.variants' => ['required', 'array', 'list', 'between:1,2'],
        'auto_or_choices.*.variants.*' => ['required', 'array', 'list', 'min:1'],
        'auto_or_choices.*.variants.*.*' => ['required', 'integer'],
    ];

    public readonly array $hiddenTypeIds;

    public readonly array $pairs;

    public readonly array $randomGroups;

    public readonly array $groups;

    private array $partners = [];

    public function __construct(?string $json)
    {
        $rules = json_decode($json ?? '', true) ?: [];
        $this->hiddenTypeIds = $rules['hidden_type_ids'] ?? [];
        $this->groups = $rules['or_groups'] ?? [
            ...array_map(fn ($pair) => [
                'type_ids' => [$pair['type_id'], $pair['partner_id']],
                'random_pick' => false,
            ], $rules['or_pairs'] ?? []),
            ...array_map(fn ($group) => [
                'type_ids' => $group['type_ids'],
                'random_pick' => true,
            ], $rules['random_or_groups'] ?? []),
        ];
        $this->pairs = array_values(array_map(fn ($group) => [
            'type_id' => $group['type_ids'][0],
            'partner_id' => $group['type_ids'][1],
        ], array_filter($this->groups, fn ($group) => count($group['type_ids']) === 2)));
        $this->randomGroups = array_values(array_map(fn ($group) => [
            'type_ids' => $group['type_ids'],
        ], array_filter($this->groups, fn ($group) => $group['random_pick'])));

        foreach ($this->pairs as $pair) {
            $this->partners[$pair['type_id']] = $pair['partner_id'];
            $this->partners[$pair['partner_id']] = $pair['type_id'];
        }
    }

    public static function forSubject(int $subject): self
    {
        return new self(DB::table('qat_subjects')->where('id', $subject)->value('question_type_rules'));
    }

    public static function availableTypes(int $subject): Collection
    {
        $questions = DB::table('qat_questions as question')
            ->join('qat_chapters as chapter', 'chapter.id', '=', 'question.qat_chapter_id')
            ->where('chapter.qat_subject_id', $subject);
        $base = (clone $questions)->select('question.question_type_id');
        $monthly = $questions->join('qat_month_edits as edit', 'edit.record_id', '=', 'question.id')
            ->where('edit.kind', 'question')->whereNotNull('edit.question_type_id')->select('edit.question_type_id');

        return DB::query()->fromSub($base->union($monthly), 'available')
            ->leftJoin('question_types as type', 'type.id', '=', 'available.question_type_id')
            ->orderByDesc('type.is_objective')->orderBy('type.name')->orderBy('available.question_type_id')
            ->get(['available.question_type_id as id', 'type.name', 'type.is_objective']);
    }

    public function partner(int $type): ?int
    {
        return $this->partners[$type] ?? null;
    }

    public function autoDistribution(Collection $sections, array $groups): Collection
    {
        $anchors = [];
        foreach ($groups as $group) {
            $ids = $group['type_ids'];
            $anchor = $ids[0];
            foreach ($ids as $id) {
                $anchors[$id] = $anchor;
                if (! $sections->has($anchor) && $sections->has($id)) {
                    $sections->put($anchor, [...$sections->get($id), 'question_type_id' => $anchor]);
                }
            }
        }

        return $sections->reject(fn ($row, $id) => isset($anchors[$id]) && $anchors[$id] !== (int) $id);
    }

    public function templateSections(array $sections, bool $automatic): array
    {
        return $automatic
            ? $this->autoDistribution(collect($sections)->keyBy('question_type_id'), $this->groups)->values()->all()
            : $sections;
    }

    public function visibleTemplateSections(array $sections, bool $automatic): array
    {
        $visibleAnchors = $automatic
            ? array_column(array_filter($this->groups, fn ($group) => array_diff($group['type_ids'], $this->hiddenTypeIds) !== []), 'type_ids')
            : [];
        $anchors = array_column($visibleAnchors, 0);

        return array_values(array_filter($sections, fn ($section) => in_array((int) $section['question_type_id'], $anchors, true)
            || ! in_array((int) $section['question_type_id'], $this->hiddenTypeIds, true)));
    }

    public function validateAutoChoices(array $choices, Collection $groups, Collection $distribution, int $variants): array
    {
        $selected = [];
        foreach ($choices as $choice) {
            $anchor = (int) $choice['question_type_id'];
            $members = $groups->get($anchor)['type_ids'] ?? [];
            if ($members === [] || ! $distribution->has($anchor) || count($choice['variants']) !== $variants) {
                throw ValidationException::withMessages([
                    'auto_or_choices' => 'Refresh the OR choices for the current question distribution and paper variants.',
                ]);
            }

            foreach ($choice['variants'] as $index => $types) {
                $ids = array_map('intval', $types);
                if (array_diff($ids, $members) !== [] || count(array_unique($ids)) !== count($ids)) {
                    throw ValidationException::withMessages([
                        'auto_or_choices' => 'Choose distinct question types from the configured OR group.',
                    ]);
                }
                $selected[$anchor][$index] = $ids;
            }
        }

        return $selected;
    }

    public function validatePairs(array $pairs, array $availableTypes, bool $requireConfigured = true): array
    {
        $available = array_fill_keys($availableTypes, true);
        $used = [];
        $validated = [];
        foreach ($pairs as $pair) {
            $type = (int) $pair['type_id'];
            $partner = (int) $pair['partner_id'];
            if ($type === $partner || ! isset($available[$type], $available[$partner])
                || isset($used[$type]) || isset($used[$partner])
                || ($requireConfigured && $this->partner($type) !== $partner)) {
                throw ValidationException::withMessages([
                    'or_pairs' => 'Choose an available OR partner for each type. Each type can belong to only one pair.',
                ]);
            }

            $validated[] = ['type_id' => $type, 'partner_id' => $partner];
            $used[$type] = $used[$partner] = true;
        }

        return $validated;
    }
}
