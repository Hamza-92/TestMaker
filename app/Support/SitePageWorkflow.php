<?php

namespace App\Support;

use App\Models\SitePage;
use App\Models\SitePageRevision;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SitePageWorkflow
{
    public static function save(SitePage $page, array $content, int $version, bool $publish, int $userId, ?string $slug = null): void
    {
        DB::transaction(function () use ($page, $content, $version, $publish, $userId, $slug) {
            $page = SitePage::query()->whereKey($page->id)->lockForUpdate()->firstOrFail();

            if ($page->version !== $version) {
                throw ValidationException::withMessages([
                    'version' => 'This page changed since you opened it. Reload before saving.',
                ]);
            }

            if ($slug !== null) {
                $page->slug = $slug;
            }
            $page->draft_content = $content;
            $page->version++;

            if ($publish) {
                $page->published_content = $content;
                $page->published_at = now();
            }

            $page->save();

            if ($publish) {
                $page->revisions()->create([
                    'number' => (int) $page->revisions()->max('number') + 1,
                    'content' => $content,
                    'published_by' => $userId,
                    'created_at' => now(),
                ]);
            }
        });
    }

    public static function restore(SitePage $page, SitePageRevision $revision, int $version): void
    {
        DB::transaction(function () use ($page, $revision, $version) {
            $page = SitePage::query()->whereKey($page->id)->lockForUpdate()->firstOrFail();
            abort_unless($revision->site_page_id === $page->id, 404);

            if ($page->version !== $version) {
                throw ValidationException::withMessages([
                    'version' => 'This page changed since you opened it. Reload before restoring.',
                ]);
            }

            $page->draft_content = $revision->content;
            $page->version++;
            $page->save();
        });
    }
}
