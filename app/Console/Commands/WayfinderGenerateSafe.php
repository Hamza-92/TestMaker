<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Filesystem\Filesystem;

class WayfinderGenerateSafe extends Command
{
    /**
     * Mirrors the wayfinder:generate signature (minus --path, which this
     * command owns) so the Vite plugin can append its flags unchanged.
     */
    protected $signature = 'wayfinder:generate-safe {--skip-actions} {--skip-routes} {--with-form}';

    protected $description = 'Run wayfinder:generate via a temp dir to avoid Windows file-lock failures';

    /**
     * wayfinder:generate deletes resources/js/{actions,routes,wayfinder} and
     * instantly recreates the same paths. On Windows, watchers (VS Code's TS
     * server, antivirus scanners) hold handles on the old files, so the
     * recreate fails with "Permission denied" — and retrying just re-runs the
     * same delete/recreate race.
     *
     * Instead, generate into a unique-per-run temp directory (so no path is
     * ever recreated after a delete — even the scanner can't collide with
     * names it has never seen), then overwrite the real files in place:
     * in-place writes don't conflict with readers the way delete-then-
     * recreate does, and files whose content is unchanged are skipped
     * entirely so a no-op regeneration touches nothing.
     */
    public function handle(Filesystem $files): int
    {
        $parent = storage_path('framework/wayfinder-tmp');
        $tmp = "{$parent}/".uniqid();

        // Sweep leftovers from earlier runs; locked stragglers are harmless
        // because every run uses a fresh directory name.
        try {
            $files->deleteDirectory($parent);
        } catch (\Throwable) {
            // ignore
        }

        $exit = $this->call('wayfinder:generate', [
            '--skip-actions' => $this->option('skip-actions'),
            '--skip-routes' => $this->option('skip-routes'),
            '--with-form' => $this->option('with-form'),
            '--path' => $tmp,
        ]);

        if ($exit !== self::SUCCESS) {
            return $exit;
        }

        foreach (['actions', 'routes', 'wayfinder'] as $dir) {
            if ($files->isDirectory("{$tmp}/{$dir}")) {
                $this->mirror($files, "{$tmp}/{$dir}", resource_path("js/{$dir}"));
            }
        }

        try {
            $files->deleteDirectory($parent);
        } catch (\Throwable) {
            // ignore
        }

        return self::SUCCESS;
    }

    private function mirror(Filesystem $files, string $source, string $target): void
    {
        $wanted = [];

        foreach ($files->allFiles($source) as $file) {
            $relative = $file->getRelativePathname();
            $wanted[str_replace('\\', '/', $relative)] = true;

            $targetPath = "{$target}/{$relative}";
            $contents = $files->get($file->getPathname());

            if ($files->exists($targetPath) && $files->get($targetPath) === $contents) {
                continue;
            }

            $files->ensureDirectoryExists(dirname($targetPath));
            $this->overwrite($files, $targetPath, $contents);
        }

        // Best-effort removal of files for deleted routes/controllers. A
        // locked file ends up pending-delete, which is fine — we never
        // recreate it, so the name is released once the watcher lets go.
        if ($files->isDirectory($target)) {
            foreach ($files->allFiles($target) as $file) {
                if (! isset($wanted[str_replace('\\', '/', $file->getRelativePathname())])) {
                    try {
                        $files->delete($file->getPathname());
                    } catch (\Throwable) {
                        $this->warn("[Wayfinder] Could not remove stale file {$file->getPathname()}");
                    }
                }
            }
        }
    }

    private function overwrite(Filesystem $files, string $path, string $contents): void
    {
        $maxAttempts = 5;

        for ($attempt = 1; ; $attempt++) {
            try {
                $files->put($path, $contents);

                return;
            } catch (\Throwable $e) {
                if ($attempt >= $maxAttempts) {
                    throw $e;
                }

                usleep($attempt * 200_000);
            }
        }
    }
}
