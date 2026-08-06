<?php

namespace App\Support\LegacyTransfer;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LegacyAssetMigrator
{
    private int $copied = 0;

    private int $reused = 0;

    /** @var array<string, true> */
    private array $missing = [];

    /** @var array<string, string> */
    private array $sourceCache = [];

    public function reset(): void
    {
        $this->copied = 0;
        $this->reused = 0;
        $this->missing = [];
        $this->sourceCache = [];
    }

    public function migrateHtml(?string $html): ?string
    {
        if ($html === null || trim($html) === '') {
            return $html;
        }

        // Some legacy editor values contain the complete image markup encoded
        // as text. Decode only when that reveals an image tag, preserving all
        // other entities in ordinary question text.
        if (stripos($html, '<img') === false) {
            $decodedHtml = html_entity_decode($html, ENT_QUOTES | ENT_HTML5);

            if (stripos($decodedHtml, '<img') === false) {
                return $html;
            }

            $html = $decodedHtml;
        }

        return preg_replace_callback(
            '/(<img\b[^>]*?\bsrc\s*=\s*)(?:(["\'])(.*?)\2|([^\s>]+))/isu',
            function (array $match): string {
                $quote = $match[2] ?? '';
                $source = $match[3] ?? ($match[4] ?? '');
                $url = $this->migrateSource(html_entity_decode($source, ENT_QUOTES | ENT_HTML5));

                return $match[1].$quote.htmlspecialchars($url, ENT_QUOTES | ENT_HTML5).$quote;
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

        if (array_key_exists($source, $this->sourceCache)) {
            return $this->sourceCache[$source];
        }

        if ($source === '' || Str::startsWith($source, ['data:', 'blob:', '/storage/legacy-content/'])) {
            return $source;
        }

        $path = parse_url($source, PHP_URL_PATH);
        if (! is_string($path) || $path === '') {
            return $source;
        }

        if (preg_match('/^https?:\/\//i', $source)) {
            $host = strtolower((string) parse_url($source, PHP_URL_HOST));
            if (! $this->isAllowedLegacyHost($host)) {
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

        $sourcePath = null;
        $root = (string) config('legacy-transfer.asset_root', 'C:\\xampp\\htdocs\\testmaker');
        $rootPath = realpath($root);

        if ($rootPath !== false) {
            $sourcePath = realpath(rtrim($root, '\\/').DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relativePath));

            // The legacy preview retries broken images under ULC/.
            if (($sourcePath === false || ! is_file($sourcePath)) && ! Str::startsWith($relativePath, 'ULC/')) {
                $fallbackRelativePath = 'ULC/'.$relativePath;
                $sourcePath = realpath(rtrim($root, '\\/').DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $fallbackRelativePath));
            }

            if ($sourcePath !== false && is_file($sourcePath)) {
                $normalizedRoot = strtolower(str_replace('\\', '/', rtrim($rootPath, '\\/')).'/');
                $normalizedSource = strtolower(str_replace('\\', '/', $sourcePath));

                if (! str_starts_with($normalizedSource, $normalizedRoot)) {
                    $sourcePath = null;
                }
            } else {
                $sourcePath = null;
            }
        }

        $contents = null;
        if ($sourcePath === null) {
            $remoteAsset = $this->fetchRemoteAsset($source, $relativePath);

            if ($remoteAsset === null) {
                $this->missing[$source] = true;
                $this->sourceCache[$source] = $source;

                return $source;
            }

            $contents = $remoteAsset['contents'];
            $extension = $remoteAsset['extension'];
            $hash = hash('sha256', $contents);
        } else {
            $extension = strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION));
            $extension = preg_match('/^[a-z0-9]{1,8}$/', $extension) ? '.'.$extension : '';
            $hash = hash_file('sha256', $sourcePath);
        }

        $destination = 'legacy-content/'.$hash.$extension;

        if (Storage::disk('public')->exists($destination)) {
            $this->reused++;
        } else {
            $contents ??= file_get_contents($sourcePath);

            if ($contents === false || ! Storage::disk('public')->put($destination, $contents)) {
                $this->missing[$source] = true;

                return $source;
            }

            $this->copied++;
        }

        $migratedSource = '/storage/'.$destination;
        $this->sourceCache[$source] = $migratedSource;

        return $migratedSource;
    }

    /** @return array{contents: string, extension: string}|null */
    private function fetchRemoteAsset(string $source, string $relativePath): ?array
    {
        $candidates = [];
        $isAbsolute = (bool) preg_match('/^https?:\/\//i', $source);

        if ($isAbsolute) {
            $host = strtolower((string) parse_url($source, PHP_URL_HOST));
            if ($this->isAllowedLegacyHost($host)) {
                $candidates[] = $source;

                $scheme = (string) parse_url($source, PHP_URL_SCHEME);
                $origin = $scheme.'://'.$host;
                $port = parse_url($source, PHP_URL_PORT);
                if (is_int($port)) {
                    $origin .= ':'.$port;
                }

                $candidates[] = rtrim($origin, '/').'/'.ltrim($relativePath, '/');
            }
        }

        $baseUrl = rtrim((string) config('legacy-transfer.asset_url', 'https://testmaker.pk'), '/');
        if ($baseUrl !== '') {
            $candidates[] = $baseUrl.'/'.ltrim($relativePath, '/');

            if (! Str::startsWith($relativePath, 'ULC/')) {
                $candidates[] = $baseUrl.'/ULC/'.ltrim($relativePath, '/');
            }
        }

        foreach (array_values(array_unique($candidates)) as $candidate) {
            try {
                // A transfer should not block the whole request on one remote
                // image. Valid assets normally respond immediately; missing
                // assets fall through to the next candidate/fallback.
                $response = Http::connectTimeout(3)->timeout(8)->get($candidate);
            } catch (\Throwable) {
                continue;
            }

            if (! $response->successful() || trim($response->body()) === '') {
                continue;
            }

            $contentType = strtolower((string) $response->header('Content-Type'));
            if (str_contains($contentType, 'text/html')) {
                continue;
            }

            $extension = strtolower(pathinfo((string) parse_url($candidate, PHP_URL_PATH), PATHINFO_EXTENSION));
            if (! preg_match('/^[a-z0-9]{1,8}$/', $extension)) {
                $extension = match (true) {
                    str_contains($contentType, 'svg') => 'svg',
                    str_contains($contentType, 'png') => 'png',
                    str_contains($contentType, 'jpeg'), str_contains($contentType, 'jpg') => 'jpg',
                    str_contains($contentType, 'gif') => 'gif',
                    str_contains($contentType, 'webp') => 'webp',
                    default => '',
                };
            }

            return [
                'contents' => $response->body(),
                'extension' => $extension === '' ? '' : '.'.$extension,
            ];
        }

        return null;
    }

    private function isAllowedLegacyHost(?string $host): bool
    {
        return in_array(strtolower((string) $host), [
            'localhost',
            '127.0.0.1',
            'testmaker.pk',
            'www.testmaker.pk',
        ], true);
    }
}
