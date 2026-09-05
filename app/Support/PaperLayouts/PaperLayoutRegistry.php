<?php

namespace App\Support\PaperLayouts;

final class PaperLayoutRegistry
{
    public const STANDARD = 'standard';

    public const FEDERAL_BOARD = 'federal-board';

    /**
     * @return array<string, array{name: string, description: string, features: array<int, string>}>
     */
    public static function all(): array
    {
        return [
            self::STANDARD => [
                'name' => 'Standard',
                'description' => 'The flexible general-purpose paper layout used by most patterns.',
                'features' => [
                    'Configurable objective presentation',
                    'Standard subjective and OR-group layouts',
                    'Optional configured paper sections',
                ],
            ],
            self::FEDERAL_BOARD => [
                'name' => 'Federal Board',
                'description' => 'Federal board structure with bordered objective tables and side-by-side subjective alternatives.',
                'features' => [
                    'Automatic Section A for objectives',
                    'Bordered S#, Question, A–D objective table',
                    'Automatic same-type OR alternatives for subjective questions',
                    'Section totals shown in section headings',
                ],
            ],
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function keys(): array
    {
        return array_keys(self::all());
    }

    public static function normalize(?string $key): string
    {
        return in_array($key, self::keys(), true) ? $key : self::STANDARD;
    }
}
