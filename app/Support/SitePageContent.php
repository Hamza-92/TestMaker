<?php

namespace App\Support;

use App\Models\SiteMedia;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SitePageContent
{
    public static function defaults(string $title): array
    {
        return [
            'seo' => ['title' => $title.' | TestMaker', 'description' => ''],
            'hero' => ['eyebrow' => '', 'title' => $title, 'description' => ''],
            'sections' => [],
        ];
    }

    public static function rules(): array
    {
        $url = ['nullable', 'string', 'max:500', 'regex:~^(?:/(?!/)[^\s]*|https://[^\s]+|mailto:[^\s]+|tel:\+?[0-9 -]+|\#[a-zA-Z0-9_-]+)$~i'];

        return [
            'version' => ['required', 'integer', 'min:1'],
            'publish' => ['required', 'boolean'],
            'content' => ['required', 'array:seo,hero,sections'],
            'content.seo' => ['required', 'array:title,description'],
            'content.seo.title' => ['required', 'string', 'max:90'],
            'content.seo.description' => ['nullable', 'string', 'max:180'],
            'content.hero' => ['required', 'array:eyebrow,title,description'],
            'content.hero.eyebrow' => ['nullable', 'string', 'max:90'],
            'content.hero.title' => ['required', 'string', 'max:140'],
            'content.hero.description' => ['nullable', 'string', 'max:350'],
            'content.sections' => ['present', 'array', 'max:30'],
            'content.sections.*' => ['required', 'array:id,type,title,body,image_ids,button_label,button_url,visible,columns'],
            'content.sections.*.id' => ['required', 'string', 'max:80', 'distinct'],
            'content.sections.*.type' => ['required', Rule::in(['text', 'gallery', 'cta', 'columns'])],
            'content.sections.*.title' => ['required', 'string', 'max:140'],
            'content.sections.*.body' => ['nullable', 'string', 'max:20000'],
            'content.sections.*.image_ids' => ['present', 'array', 'max:24'],
            'content.sections.*.image_ids.*' => ['required', 'integer', Rule::exists('site_media', 'id')],
            'content.sections.*.button_label' => ['nullable', 'string', 'max:80'],
            'content.sections.*.button_url' => $url,
            'content.sections.*.visible' => ['required', 'boolean'],
            'content.sections.*.columns' => ['sometimes', 'array', 'max:3'],
            'content.sections.*.columns.*' => ['required', 'array:id,body'],
            'content.sections.*.columns.*.id' => ['required', 'string', 'max:80'],
            'content.sections.*.columns.*.body' => ['nullable', 'string', 'max:20000'],
        ];
    }

    public static function clean(array $content, bool $publish): array
    {
        $content['seo']['description'] = $content['seo']['description'] ?? '';
        $content['hero']['eyebrow'] = $content['hero']['eyebrow'] ?? '';
        $content['hero']['description'] = $content['hero']['description'] ?? '';

        foreach ($content['sections'] as &$section) {
            $section['body'] = SiteHtml::clean($section['body'] ?? '');
            $section['columns'] = $section['type'] === 'columns'
                ? array_map(fn ($column) => [
                    'id' => $column['id'],
                    'body' => SiteHtml::clean($column['body'] ?? ''),
                ], $section['columns'] ?? [])
                : [];
            $section['button_label'] = $section['button_label'] ?? '';
            $section['button_url'] = $section['button_url'] ?? '';

            if ($section['type'] === 'columns' && ! in_array(count($section['columns']), [2, 3], true)) {
                throw ValidationException::withMessages(['content.sections' => 'A columns section needs two or three columns.']);
            }

            if ($publish && $section['visible'] && $section['type'] === 'gallery' && count($section['image_ids']) === 0) {
                throw ValidationException::withMessages(['content.sections' => 'Add at least one image to each visible gallery.']);
            }
            if ($publish && $section['visible'] && $section['type'] === 'cta' && (! $section['button_label'] || ! $section['button_url'])) {
                throw ValidationException::withMessages(['content.sections' => 'Add button text and a link to each visible call to action.']);
            }
        }
        unset($section);

        $mediaIds = self::mediaIds($content);
        if ($mediaIds && SiteMedia::query()->whereIn('id', $mediaIds)->count() !== count($mediaIds)) {
            throw ValidationException::withMessages(['content.sections' => 'One or more images are no longer in the media library.']);
        }

        return $content;
    }

    public static function mediaIds(?array $content): array
    {
        $ids = [];
        foreach ($content['sections'] ?? [] as $section) {
            array_push($ids, ...($section['image_ids'] ?? []));
            array_push($ids, ...SiteHtml::mediaIds($section['body'] ?? ''));
            foreach ($section['columns'] ?? [] as $column) {
                array_push($ids, ...SiteHtml::mediaIds($column['body'] ?? ''));
            }
        }

        return array_values(array_unique(array_map('intval', $ids)));
    }
}
