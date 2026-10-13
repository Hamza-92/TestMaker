<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\SiteMedia;
use App\Models\SitePage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SiteMediaController extends Controller
{
    public function index(): Response
    {
        $usedIds = SitePage::withTrashed()->get(['draft_content', 'published_content'])
            ->flatMap(function (SitePage $page) {
                return collect([$page->draft_content, $page->published_content])
                    ->flatMap(fn ($content) => collect($content['sections'] ?? [])->pluck('image_ids')->flatten());
            })->unique()->all();

        return Inertia::render('superadmin/site/media', [
            'media' => SiteMedia::query()->latest()->get(['id', 'name', 'mime_type', 'byte_size', 'alt_text', 'caption', 'created_at'])
                ->map(fn (SiteMedia $media) => [
                    ...$media->only(['id', 'name', 'mime_type', 'byte_size', 'alt_text', 'caption']),
                    'url' => $media->url,
                    'inUse' => in_array($media->id, $usedIds, true),
                ]),
            'canEdit' => request()->user()->can('site_pages.edit'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'alt_text' => ['required', 'string', 'max:180'],
            'caption' => ['nullable', 'string', 'max:180'],
        ]);
        $file = $data['image'];

        SiteMedia::query()->create([
            'name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'byte_size' => $file->getSize(),
            'alt_text' => $data['alt_text'],
            'caption' => $data['caption'] ?? null,
            'data_base64' => base64_encode(file_get_contents($file->getRealPath())),
        ]);

        return back()->with('success', 'Image added to the media library.');
    }

    public function update(Request $request, SiteMedia $media): RedirectResponse
    {
        $data = $request->validate([
            'alt_text' => ['required', 'string', 'max:180'],
            'caption' => ['nullable', 'string', 'max:180'],
        ]);
        $media->update($data);

        return back()->with('success', 'Image details saved.');
    }

    public function destroy(SiteMedia $media): RedirectResponse
    {
        $used = SitePage::withTrashed()->get(['draft_content', 'published_content'])->contains(function (SitePage $page) use ($media) {
            foreach ([$page->draft_content, $page->published_content] as $content) {
                foreach ($content['sections'] ?? [] as $section) {
                    if (in_array($media->id, $section['image_ids'] ?? [], true)) {
                        return true;
                    }
                }
            }

            return false;
        });
        abort_if($used, 409, 'This image is used on a page. Remove it from the page first.');
        $media->delete();

        return back()->with('success', 'Image removed.');
    }
}
