<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\PublicSitePageController;
use App\Models\SiteMedia;
use App\Models\SiteMenu;
use App\Models\SitePage;
use App\Models\SitePageRevision;
use App\Support\PricingPageContent;
use App\Support\SiteNavigation;
use App\Support\SitePageContent;
use App\Support\SitePageWorkflow;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SitePageController extends Controller
{
    public function index(): Response
    {
        PricingPageContent::page();
        $pages = SitePage::withTrashed()->orderBy('slug')->get(['id', 'slug', 'template', 'draft_content', 'published_at', 'updated_at', 'deleted_at']);

        return Inertia::render('superadmin/site/pages', [
            'pages' => $pages->map(fn (SitePage $page) => [
                'id' => $page->id,
                'title' => $page->template === 'pricing' ? 'Pricing' : ($page->draft_content['hero']['title'] ?? $page->slug),
                'slug' => $page->slug,
                'template' => $page->template,
                'publishedAt' => $page->published_at?->toIso8601String(),
                'updatedAt' => $page->updated_at?->toIso8601String(),
                'archived' => $page->trashed(),
            ]),
            'canEdit' => request()->user()->can('site_pages.edit'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:140'],
            'slug' => $this->slugRules(),
        ]);
        $this->assertAvailableSlug($data['slug']);

        $page = SitePage::query()->create([
            'slug' => $data['slug'],
            'template' => 'standard',
            'draft_content' => SitePageContent::defaults($data['title']),
        ]);

        return redirect()->route('superadmin.site.pages.edit', $page)->with('success', 'Page created as a draft.');
    }

    public function edit(SitePage $page): Response
    {
        abort_unless($page->template === 'standard', 404);

        return Inertia::render('superadmin/site/page-editor', [
            'page' => ['id' => $page->id, 'slug' => $page->slug],
            'content' => $page->draft_content,
            'version' => $page->version,
            'publishedAt' => $page->published_at?->toIso8601String(),
            'revisions' => $page->revisions()->latest('number')->limit(10)->get(['id', 'number', 'created_at']),
            'media' => $this->mediaChoices(),
            'canEdit' => request()->user()->can('site_pages.edit'),
        ]);
    }

    public function preview(SitePage $page): Response
    {
        abort_unless($page->template === 'standard', 404);

        return Inertia::render('site-page', [
            'content' => $page->draft_content,
            'media' => PublicSitePageController::mediaFor($page->draft_content),
            'preview' => true,
            'siteNavigation' => SiteNavigation::published(),
        ]);
    }

    public function update(Request $request, SitePage $page): RedirectResponse
    {
        abort_unless($page->template === 'standard', 404);
        $data = $request->validate([
            'slug' => $this->slugRules($page),
            ...SitePageContent::rules(),
        ]);
        $this->assertAvailableSlug($data['slug']);
        if ($page->published_at !== null && $data['slug'] !== $page->slug && ! $data['publish']) {
            throw ValidationException::withMessages(['slug' => 'Publish the page to change its live URL.']);
        }

        SitePageWorkflow::save(
            $page,
            SitePageContent::clean($data['content'], $data['publish']),
            $data['version'],
            $data['publish'],
            $request->user()->id,
            $data['slug'],
        );

        return back()->with('success', $data['publish'] ? 'Page published.' : 'Page draft saved.');
    }

    public function restoreRevision(Request $request, SitePage $page, SitePageRevision $revision): RedirectResponse
    {
        abort_unless($page->template === 'standard', 404);
        $data = $request->validate(['version' => ['required', 'integer', 'min:1']]);
        SitePageWorkflow::restore($page, $revision, $data['version']);

        return back()->with('success', 'Revision restored to the draft. Publish when ready.');
    }

    public function unpublish(SitePage $page): RedirectResponse
    {
        abort_unless($page->template === 'standard', 404);
        $data = request()->validate(['version' => ['required', 'integer', 'min:1']]);
        DB::transaction(function () use ($page, $data) {
            $locked = SitePage::query()->whereKey($page->id)->lockForUpdate()->firstOrFail();
            if ($locked->version !== $data['version']) {
                throw ValidationException::withMessages(['version' => 'This page changed since you opened it. Reload before unpublishing.']);
            }
            $locked->update(['published_at' => null, 'version' => $locked->version + 1]);
        });

        return back()->with('success', 'Page unpublished.');
    }

    public function archive(SitePage $page): RedirectResponse
    {
        abort_unless($page->template === 'standard', 404);
        $used = SiteMenu::query()->get(['draft_items', 'published_items'])->contains(function (SiteMenu $menu) use ($page) {
            foreach ([$menu->draft_items, $menu->published_items] as $items) {
                foreach ($items ?? [] as $item) {
                    foreach ([$item, ...($item['children'] ?? [])] as $entry) {
                        if (($entry['type'] ?? '') === 'page' && ($entry['page_id'] ?? null) === $page->id) {
                            return true;
                        }
                    }
                }
            }

            return false;
        });
        abort_if($used, 409, 'Remove this page from navigation before archiving it.');
        $page->delete();

        return redirect()->route('superadmin.site.pages')->with('success', 'Page archived.');
    }

    public function restoreArchived(int $id): RedirectResponse
    {
        $page = SitePage::withTrashed()->findOrFail($id);
        abort_unless($page->template === 'standard' && $page->trashed(), 404);
        $page->restore();

        return back()->with('success', 'Page restored.');
    }

    private function mediaChoices(): array
    {
        return SiteMedia::query()->latest()->get(['id', 'name', 'alt_text', 'caption'])
            ->map(fn (SiteMedia $media) => [
                ...$media->only(['id', 'name', 'alt_text', 'caption']),
                'url' => $media->url,
            ])->all();
    }

    private function slugRules(?SitePage $page = null): array
    {
        return ['required', 'string', 'min:2', 'max:80', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('site_pages', 'slug')->ignore($page?->id)];
    }

    private function assertAvailableSlug(string $slug): void
    {
        $matched = Route::getRoutes()->match(Request::create('/'.$slug, 'GET'));
        if ($matched->getName() !== 'site.public.page') {
            throw ValidationException::withMessages(['slug' => 'This URL is already used by the application.']);
        }
    }
}
