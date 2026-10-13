<?php

namespace App\Support;

use App\Models\SiteMenu;
use App\Models\SitePage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SiteNavigation
{
    public static function defaults(string $key): array
    {
        $item = static fn (string $id, string $label, string $url, array $children = []): array => [
            'id' => $id, 'label' => $label, 'type' => 'url', 'url' => $url,
            'page_id' => null, 'visible' => true, 'children' => $children,
        ];

        if ($key === 'footer') {
            return [
                $item('platform', 'Platform', '/', [
                    $item('footer-features', 'Features', '/#features'),
                    $item('footer-process', 'How it works', '/#how-it-works'),
                    $item('footer-pricing', 'Pricing', '/pricing'),
                    $item('footer-gallery', 'Gallery', '/#gallery'),
                ]),
                $item('schools', 'For schools', '/', [
                    $item('footer-why', 'Why choose us', '/#why-choose-us'),
                    $item('footer-testimonials', 'Testimonials', '/#testimonials'),
                    $item('footer-resources', 'Resources', '/#resources'),
                    $item('footer-about', 'About us', '/#about'),
                ]),
                $item('start', 'Get started', '/', [
                    $item('footer-register', 'Create an account', '/register'),
                    $item('footer-login', 'Log in', '/login'),
                ]),
            ];
        }

        return [
            $item('features', 'Features', '/#features'),
            $item('pricing', 'Pricing', '/pricing'),
            $item('process', 'How it Works', '/#how-it-works'),
            $item('resources', 'Resources', '/#resources', [
                $item('resources-section', 'Resources', '/#resources'),
                $item('gallery-section', 'Gallery', '/#gallery'),
            ]),
            $item('about', 'About Us', '/#about'),
        ];
    }

    public static function menu(string $key): SiteMenu
    {
        return SiteMenu::query()->firstOrCreate(
            ['key' => $key],
            ['draft_items' => self::defaults($key), 'published_items' => self::defaults($key), 'published_at' => now()],
        );
    }

    public static function published(): array
    {
        $menus = SiteMenu::query()->whereIn('key', ['header', 'footer'])->get()->keyBy('key');
        $items = [];
        $pageIds = [];

        foreach (['header', 'footer'] as $key) {
            $items[$key] = $menus->get($key)?->published_items ?? self::defaults($key);
            foreach ($items[$key] as $item) {
                if (($item['type'] ?? '') === 'page') {
                    $pageIds[] = $item['page_id'];
                }
                foreach ($item['children'] ?? [] as $child) {
                    if (($child['type'] ?? '') === 'page') {
                        $pageIds[] = $child['page_id'];
                    }
                }
            }
        }

        $pages = SitePage::query()->whereIn('id', array_unique($pageIds))
            ->whereNotNull('published_at')->get(['id', 'slug'])->keyBy('id');

        return [
            'header' => self::resolve($items['header'], $pages),
            'footer' => self::resolve($items['footer'], $pages),
        ];
    }

    private static function resolve(array $items, $pages): array
    {
        return collect($items)->filter(fn ($item) => $item['visible'] ?? false)
            ->map(function ($item) use ($pages) {
                $href = ($item['type'] ?? '') === 'page'
                    ? (($page = $pages->get($item['page_id'])) ? '/'.$page->slug : null)
                    : ($item['url'] ?? null);

                if (! $href) {
                    return null;
                }

                return [
                    'id' => $item['id'],
                    'label' => $item['label'],
                    'href' => $href,
                    'children' => collect($item['children'] ?? [])->filter(fn ($child) => $child['visible'] ?? false)
                        ->map(function ($child) use ($pages) {
                            $childHref = ($child['type'] ?? '') === 'page'
                                ? (($page = $pages->get($child['page_id'])) ? '/'.$page->slug : null)
                                : ($child['url'] ?? null);

                            return $childHref ? ['id' => $child['id'], 'label' => $child['label'], 'href' => $childHref] : null;
                        })->filter()->values()->all(),
                ];
            })->filter()->values()->all();
    }

    public static function rules(): array
    {
        $url = ['nullable', 'string', 'max:500', 'regex:~^(?:/(?!/)[^\s]*|https://[^\s]+|mailto:[^\s]+|tel:\+?[0-9 -]+|\#[a-zA-Z0-9_-]+)$~i'];

        return [
            'version' => ['required', 'integer', 'min:1'],
            'publish' => ['required', 'boolean'],
            'items' => ['present', 'array', 'max:12'],
            'items.*' => ['required', 'array:id,label,type,url,page_id,visible,children'],
            'items.*.id' => ['required', 'string', 'max:80'],
            'items.*.label' => ['required', 'string', 'max:60'],
            'items.*.type' => ['required', Rule::in(['url', 'page'])],
            'items.*.url' => $url,
            'items.*.page_id' => ['nullable', 'integer', Rule::exists('site_pages', 'id')],
            'items.*.visible' => ['required', 'boolean'],
            'items.*.children' => ['present', 'array', 'max:8'],
            'items.*.children.*' => ['required', 'array:id,label,type,url,page_id,visible,children'],
            'items.*.children.*.id' => ['required', 'string', 'max:80'],
            'items.*.children.*.label' => ['required', 'string', 'max:60'],
            'items.*.children.*.type' => ['required', Rule::in(['url', 'page'])],
            'items.*.children.*.url' => $url,
            'items.*.children.*.page_id' => ['nullable', 'integer', Rule::exists('site_pages', 'id')],
            'items.*.children.*.visible' => ['required', 'boolean'],
            'items.*.children.*.children' => ['present', 'array', 'size:0'],
        ];
    }

    public static function validateTargets(array $items, bool $publish): void
    {
        $pageIds = [];
        foreach ($items as $item) {
            foreach ([$item, ...$item['children']] as $entry) {
                if ($entry['type'] === 'page') {
                    if (! $entry['page_id']) {
                        throw ValidationException::withMessages(['items' => 'Choose a page for each page link.']);
                    }
                    $pageIds[] = $entry['page_id'];
                } elseif (! $entry['url']) {
                    throw ValidationException::withMessages(['items' => 'Enter a URL for each custom link.']);
                }
            }
        }

        if ($pageIds) {
            $pages = SitePage::query()->whereIn('id', array_unique($pageIds))->get(['id', 'published_at'])->keyBy('id');
            foreach ($pageIds as $pageId) {
                if (! $pages->has($pageId)) {
                    throw ValidationException::withMessages(['items' => 'Choose an active page for each page link.']);
                }
                if ($publish && $pages->get($pageId)->published_at === null) {
                    throw ValidationException::withMessages(['items' => 'Publish linked pages before publishing this menu.']);
                }
            }
        }
    }
}
