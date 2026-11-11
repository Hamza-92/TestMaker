<?php

namespace App\Support\Qat;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class QatQuestionTypeRules
{
    public const PAIR_RULES = [
        'or_pairs' => ['sometimes', 'array', 'max:100'],
        'or_pairs.*.type_id' => ['required', 'integer'],
        'or_pairs.*.partner_id' => ['required', 'integer'],
    ];

    public readonly array $hiddenTypeIds;

    public readonly array $pairs;

    private array $partners = [];

    public function __construct(?string $json)
    {
        $rules = json_decode($json ?? '', true) ?: [];
        $this->hiddenTypeIds = $rules['hidden_type_ids'] ?? [];
        $this->pairs = $rules['or_pairs'] ?? [];

        foreach ($this->pairs as $pair) {
            $this->partners[$pair['type_id']] = $pair['partner_id'];
            $this->partners[$pair['partner_id']] = $pair['type_id'];
        }
    }

    public static function forSubject(int $subject): self
    {
        return new self(DB::table('qat_subjects')->where('id', $subject)->value('question_type_rules'));
    }

    public function partner(int $type): ?int
    {
        return $this->partners[$type] ?? null;
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
