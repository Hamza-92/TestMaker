<?php

namespace App\Http\Controllers;

use App\Models\SiteMedia;
use App\Models\SitePage;
use App\Support\SiteNavigation;
use Inertia\Inertia;
use Inertia\Response;

class PublicSitePageController extends Controller
{
    public function show(string $slug): Response
    {
        $page = SitePage::query()->where('slug', $slug)->where('template', 'standard')
            ->whereNotNull('published_at')->firstOrFail();

        return Inertia::render('site-page', [
            'content' => $page->published_content,
            'media' => $this->mediaFor($page->published_content),
            'siteNavigation' => SiteNavigation::published(),
        ]);
    }

    public static function mediaFor(array $content): array
    {
        $ids = collect($content['sections'] ?? [])->pluck('image_ids')->flatten()->unique()->all();

        return SiteMedia::query()->whereIn('id', $ids)->get(['id', 'alt_text', 'caption'])
            ->map(fn (SiteMedia $media) => [
                'id' => $media->id,
                'alt_text' => $media->alt_text,
                'caption' => $media->caption,
                'url' => $media->url,
            ])->all();
    }
}
