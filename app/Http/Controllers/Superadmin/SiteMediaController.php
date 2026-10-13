<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\SiteMedia;
use App\Models\SitePage;
use App\Support\SitePageContent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Inertia\Inertia;
use Inertia\Response;

class SiteMediaController extends Controller
{
    public function index(): Response
    {
        $usedIds = SitePage::withTrashed()->get(['draft_content', 'published_content'])
            ->flatMap(fn (SitePage $page) => [
                ...SitePageContent::mediaIds($page->draft_content),
                ...SitePageContent::mediaIds($page->published_content),
            ])->unique()->all();

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
        $this->saveMedia($data['image'], $data['alt_text'], $data['caption'] ?? null);

        return back()->with('success', 'Image added to the media library.');
    }

    public function storeForEditor(Request $request): JsonResponse
    {
        $data = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);
        $name = trim(pathinfo($data['image']->getClientOriginalName(), PATHINFO_FILENAME));
        $media = $this->saveMedia($data['image'], mb_substr($name ?: 'Image', 0, 180));

        return response()->json([
            'location' => $media->url,
            'alt_text' => $media->alt_text,
        ], 201);
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
                if (in_array($media->id, SitePageContent::mediaIds($content), true)) {
                    return true;
                }
            }

            return false;
        });
        abort_if($used, 409, 'This image is used on a page. Remove it from the page first.');
        $media->delete();

        return back()->with('success', 'Image removed.');
    }

    private function saveMedia(UploadedFile $file, string $altText, ?string $caption = null): SiteMedia
    {
        return SiteMedia::query()->create([
            'name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'byte_size' => $file->getSize(),
            'alt_text' => $altText,
            'caption' => $caption,
            'data_base64' => base64_encode(file_get_contents($file->getRealPath())),
        ]);
    }
}
