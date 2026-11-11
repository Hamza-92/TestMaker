<?php

namespace App\Support\Qat;

final class QatQuestionLanguage
{
    public static function project(array $data, string $medium): array
    {
        $excludedSuffix = $medium === 'Urdu' ? '_en' : '_ur';
        foreach ($data as $key => $value) {
            if (is_string($key) && (str_ends_with($key, $excludedSuffix) || ($medium === 'Urdu' && $key === 'text'))) {
                unset($data[$key]);
            } elseif (is_array($value)) {
                $data[$key] = self::project($key === 'options' ? self::filledOptions($value) : $value, $medium);
            }
        }

        return $data;
    }

    public static function canRender(array $data, string $medium): bool
    {
        $locale = $medium === 'Urdu' ? 'ur' : 'en';
        $content = $data['content'] ?? [];
        $options = self::filledOptions($data['options'] ?? []) ?: self::filledOptions($content['options'] ?? []);
        $items = $content['items'] ?? [];
        $pairs = $content['pairs'] ?? [];
        $optionKeys = $medium === 'Urdu' ? ['text_ur'] : ['text_en', 'text'];
        $otherLocale = $locale === 'en' ? 'ur' : 'en';
        $hasPrompt = self::hasText($data, ["statement_{$locale}"])
            || self::hasText($content, ["prompt_{$locale}", "intro_{$locale}", "passage_{$locale}"]);

        // Reject untranslated choices without treating empty editor placeholders as choices.
        if ((! $hasPrompt && (self::hasText($data, ["statement_{$otherLocale}"])
            || self::hasText($content, ["prompt_{$otherLocale}", "intro_{$otherLocale}", "passage_{$otherLocale}"])))
            || collect($options)->contains(fn ($option) => ! self::hasText($option, $optionKeys))
            || collect($items)->contains(fn ($item) => ! self::hasText($item, ["prompt_{$locale}", "statement_{$locale}"])
                || collect(self::filledOptions($item['options'] ?? []))->contains(fn ($option) => ! self::hasText($option, $optionKeys)))
            || collect($pairs)->contains(fn ($pair) => ! self::hasText($pair, ["left_{$locale}"]) || ! self::hasText($pair, ["right_{$locale}"]))) {
            return false;
        }

        return $options !== [] || $items !== [] || $pairs !== []
            || $hasPrompt || self::hasText($data, ["description_{$locale}"])
            || self::hasText($content, ["shared_{$locale}"]);
    }

    private static function filledOptions(array $options): array
    {
        return array_values(array_filter($options, fn ($option) => self::hasText($option, ['text_en', 'text_ur', 'text'])
            || filter_var($option['is_correct'] ?? false, FILTER_VALIDATE_BOOLEAN)));
    }

    private static function hasText(array $data, array $keys): bool
    {
        foreach ($keys as $key) {
            $value = $data[$key] ?? null;
            if (! is_string($value)) {
                continue;
            }

            $decoded = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            if (preg_match('/<(?:img|svg|math)\b/i', $decoded)
                || preg_match('/[^\s\x{00a0}\x{200b}]/u', strip_tags($decoded))) {
                return true;
            }
        }

        return false;
    }
}
