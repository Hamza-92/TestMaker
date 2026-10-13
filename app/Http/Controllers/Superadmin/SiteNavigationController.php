<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\SiteMenu;
use App\Models\SitePage;
use App\Support\PricingPageContent;
use App\Support\SiteNavigation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SiteNavigationController extends Controller
{
    public function edit(): Response
    {
        PricingPageContent::page();

        return Inertia::render('superadmin/site/navigation', [
            'menus' => collect(['header', 'footer'])->mapWithKeys(function ($key) {
                $menu = SiteNavigation::menu($key);

                return [$key => [
                    'items' => $menu->draft_items,
                    'version' => $menu->version,
                    'publishedAt' => $menu->published_at?->toIso8601String(),
                ]];
            }),
            'pages' => SitePage::query()->orderBy('slug')->get(['id', 'slug', 'template', 'published_at'])
                ->map(fn (SitePage $page) => [
                    'id' => $page->id,
                    'label' => $page->template === 'pricing' ? 'Pricing' : ($page->draft_content['hero']['title'] ?? $page->slug),
                    'slug' => $page->slug,
                    'published' => $page->published_at !== null,
                ]),
            'canEdit' => request()->user()->can('site_pages.edit'),
        ]);
    }

    public function update(Request $request, string $key): RedirectResponse
    {
        abort_unless(in_array($key, ['header', 'footer'], true), 404);
        $data = $request->validate(SiteNavigation::rules());
        SiteNavigation::validateTargets($data['items'], $data['publish']);

        DB::transaction(function () use ($key, $data) {
            $menu = SiteNavigation::menu($key);
            $menu = SiteMenu::query()->whereKey($menu->id)->lockForUpdate()->firstOrFail();

            if ($menu->version !== $data['version']) {
                throw ValidationException::withMessages([
                    'version' => 'This menu changed since you opened it. Reload before saving.',
                ]);
            }

            $menu->draft_items = $data['items'];
            $menu->version++;
            if ($data['publish']) {
                $menu->published_items = $data['items'];
                $menu->published_at = now();
            }
            $menu->save();
        });

        return back()->with('success', $data['publish'] ? 'Navigation published.' : 'Navigation draft saved.');
    }
}
