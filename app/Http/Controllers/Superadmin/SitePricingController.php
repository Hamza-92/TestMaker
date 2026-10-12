<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\SitePage;
use App\Models\SitePageRevision;
use App\Support\PricingPageContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SitePricingController extends Controller
{
    public function edit(): Response
    {
        $page = PricingPageContent::page();

        return Inertia::render('superadmin/site/pricing', [
            'content' => $page->draft_content,
            'version' => $page->version,
            'publishedAt' => $page->published_at?->toIso8601String(),
            'revisions' => $page->revisions()->latest('number')->limit(10)->get(['id', 'number', 'created_at']),
            'canEdit' => request()->user()->can('site_pages.edit'),
        ]);
    }

    public function preview(): Response
    {
        return Inertia::render('pricing', [
            'content' => PricingPageContent::page()->draft_content,
            'preview' => true,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'version' => ['required', 'integer', 'min:1'],
            'publish' => ['required', 'boolean'],
            ...PricingPageContent::rules(),
        ]);

        foreach ($data['content']['plans'] as &$plan) {
            $plan['period'] = $plan['period'] ?? '';
            $plan['badge'] = $plan['badge'] ?? '';
        }
        unset($plan);

        DB::transaction(function () use ($request, $data) {
            $page = PricingPageContent::page();
            $page = SitePage::query()->whereKey($page->id)->lockForUpdate()->firstOrFail();

            if ($page->version !== $data['version']) {
                throw ValidationException::withMessages([
                    'version' => 'This page changed since you opened it. Reload before saving.',
                ]);
            }

            $page->draft_content = $data['content'];
            $page->version++;

            if ($data['publish']) {
                $page->published_content = $data['content'];
                $page->published_at = now();
            }

            $page->save();

            if ($data['publish']) {
                $page->revisions()->create([
                    'number' => (int) $page->revisions()->max('number') + 1,
                    'content' => $data['content'],
                    'published_by' => $request->user()->id,
                    'created_at' => now(),
                ]);
            }
        });

        return back()->with('success', $data['publish'] ? 'Pricing page published.' : 'Pricing draft saved.');
    }

    public function restore(Request $request, SitePageRevision $revision): RedirectResponse
    {
        DB::transaction(function () use ($request, $revision) {
            $page = PricingPageContent::page();
            $page = SitePage::query()->whereKey($page->id)->lockForUpdate()->firstOrFail();
            abort_unless($revision->site_page_id === $page->id, 404);

            $data = $request->validate(['version' => ['required', 'integer', 'min:1']]);
            if ($page->version !== $data['version']) {
                throw ValidationException::withMessages([
                    'version' => 'This page changed since you opened it. Reload before restoring.',
                ]);
            }

            $page->draft_content = $revision->content;
            $page->version++;
            $page->save();
        });

        return back()->with('success', 'Revision restored to the draft. Publish when ready.');
    }
}
