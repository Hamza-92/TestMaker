<?php

namespace App\Support\LegacyTransfer;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LegacyAssetMigrator
{
    private int $copied = 0;

    private int $reused = 0;

    /** @var array<string, true> */
    private array $missing = [];

    public function reset(): void
    {
        $this->copied = 0;
        $this->reused = 0;
        $this->missing = [];
    }

    public function migrateHtml(?string $html): ?string
    {
        if ($html === null || trim($html) === '' || stripos($html, '<img') === false) {
            return $html;
        }

        return preg_replace_callback(
            '/(<img\b[^>]*?\bsrc\s*=\s*)(["\'])(.*?)\2/isu',
            function (array $match): string {
                $url = $this->migrateSource(html_entity_decode($match[3], ENT_QUOTES | ENT_HTML5));

                return $match[1].$match[2].htmlspecialchars($url, ENT_QUOTES | ENT_HTML5).$match[2];
            },
            $html,
        ) ?? $html;
    }

    /** @return array{copied: int, reused: int, missing: int, missing_sources: array<int, string>} */
    public function report(): array
    {
        return [
            'copied' => $this->copied,
            'reused' => $this->reused,
            'missing' => count($this->missing),
            'missing_sources' => array_slice(array_keys($this->missing), 0, 50),
        ];
    }

    private function migrateSource(string $source): string
    {
        $source = trim($source);

        if ($source === '' || Str::startsWith($source, ['data:', 'blob:', '/storage/legacy-content/'])) {
            return $source;
        }

        $path = parse_url($source, PHP_URL_PATH);
        if (! is_string($path) || $path === '') {
            return $source;
        }

        if (preg_match('/^https?:\/\//i', $source)) {
            $host = strtolower((string) parse_url($source, PHP_URL_HOST));
            if (! in_array($host, ['localhost', '127.0.0.1', 'testmaker.pk', 'www.testmaker.pk'], true)) {
                return $source;
            }
        }

        $relativePath = rawurldecode(str_replace('\\', '/', $path));
        $relativePath = preg_replace('#^/testmaker/#i', '/', $relativePath) ?? $relativePath;
        $relativePath = ltrim($relativePath, '/');

        if ($relativePath === '' || str_contains($relativePath, '../')) {
            $this->missing[$source] = true;

            return $source;
        }

        $root = (string) config('legacy-transfer.asset_root', 'C:\\xampp\\htdocs\\testmaker');
        $rootPath = realpath($root);
        $sourcePath = realpath(rtrim($root, '\\/').DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relativePath));

        if ($rootPath === false || $sourcePath === false || ! is_file($sourcePath)) {
            $this->missing[$source] = true;

            return $source;
        }

        $normalizedRoot = strtolower(str_replace('\\', '/', rtrim($rootPath, '\\/')).'/');
        $normalizedSource = strtolower(str_replace('\\', '/', $sourcePath));
        if (! str_starts_with($normalizedSource, $normalizedRoot)) {
            $this->missing[$source] = true;

            return $source;
        }

        $extension = strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION));
        $extension = preg_match('/^[a-z0-9]{1,8}$/', $extension) ? '.'.$extension : '';
        $destination = 'legacy-content/'.hash_file('sha256', $sourcePath).$extension;

        if (Storage::disk('public')->exists($destination)) {
            $this->reused++;
        } else {
            $contents = file_get_contents($sourcePath);
            if ($contents === false || ! Storage::disk('public')->put($destination, $contents)) {
                $this->missing[$source] = true;

                return $source;
            }
            $this->copied++;
        }

        return '/storage/'.$destination;
    }
}
