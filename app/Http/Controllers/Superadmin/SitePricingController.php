<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\SitePageRevision;
use App\Support\PricingPageContent;
use App\Support\SiteNavigation;
use App\Support\SitePageWorkflow;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
            'siteNavigation' => SiteNavigation::published(),
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

        SitePageWorkflow::save(
            PricingPageContent::page(), $data['content'], $data['version'], $data['publish'], $request->user()->id,
        );

        return back()->with('success', $data['publish'] ? 'Pricing page published.' : 'Pricing draft saved.');
    }

    public function restore(Request $request, SitePageRevision $revision): RedirectResponse
    {
        $data = $request->validate(['version' => ['required', 'integer', 'min:1']]);
        SitePageWorkflow::restore(PricingPageContent::page(), $revision, $data['version']);

        return back()->with('success', 'Revision restored to the draft. Publish when ready.');
    }
}
