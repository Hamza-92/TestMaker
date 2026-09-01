<?php

namespace App\Support\LegacyTransfer;

use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LegacyAssetMigrator
{
    private const REMOTE_BATCH_SIZE = 4;

    private const IMAGE_SOURCE_PATTERN = '/(<img\b[^>]*?\bsrc\s*=\s*)(?:(["\'])(.*?)\2|([^\s>]+))/isu';

    private int $copied = 0;

    private int $reused = 0;

    /** @var array<string, true> */
    private array $missing = [];

    /** @var array<string, string> */
    private array $sourceCache = [];

    private bool $prefetchComplete = false;

    public function reset(): void
    {
        $this->copied = 0;
        $this->reused = 0;
        $this->missing = [];
        $this->sourceCache = [];
        $this->prefetchComplete = false;
    }

    public function finishPrefetch(): void
    {
        $this->prefetchComplete = true;
    }

    public function prefetchHtml(iterable $values): void
    {
        $sources = [];

        foreach ($values as $value) {
            $this->collectImageSources($value, $sources);
        }

        $pending = [];
        foreach (array_keys($sources) as $source) {
            if (array_key_exists($source, $this->sourceCache)) {
                continue;
            }

            $persistedSource = $this->persistedSource($source);
            if ($persistedSource !== null) {
                $this->reused++;
                $this->sourceCache[$source] = $persistedSource;

                continue;
            }

            $relativePath = $this->relativePath($source);
            if ($relativePath === null) {
                continue;
            }

            if ($this->localSourcePath($relativePath) !== null) {
                $this->migrateSource($source);

                continue;
            }

            $candidates = $this->remoteCandidates($source, $relativePath);
            if ($candidates === []) {
                continue;
            }

            $pending[] = [
                'source' => $source,
                'relative_path' => $relativePath,
                'candidates' => $candidates,
                'candidate_index' => 0,
            ];
        }

        while ($pending !== []) {
            $nextRound = [];

            foreach (array_chunk($pending, self::REMOTE_BATCH_SIZE) as $batch) {
                $responses = Http::pool(function (Pool $pool) use ($batch): array {
                    $requests = [];

                    foreach ($batch as $index => $item) {
                        $candidate = $item['candidates'][$item['candidate_index']];
                        $request = $pool->as((string) $index)
                            ->connectTimeout(3)
                            ->timeout(20)
                            ->retry(3, 250, throw: false);

                        if ($this->isAllowedLegacyHost(parse_url($candidate, PHP_URL_HOST))) {
                            $request = $request->withoutVerifying();
                        }

                        $requests[] = $request->get($candidate);
                    }

                    return $requests;
                });

                foreach ($batch as $index => $item) {
                    $candidate = $item['candidates'][$item['candidate_index']];
                    $response = $responses[(string) $index] ?? null;
                    $remoteAsset = $response instanceof Response
                        ? $this->remoteAssetFromResponse($response, $candidate)
                        : null;

                    if ($remoteAsset !== null) {
                        $this->storeRemoteAsset(
                            source: $item['source'],
                            contents: $remoteAsset['contents'],
                            extension: $remoteAsset['extension'],
                        );

                        continue;
                    }

                    $item['candidate_index']++;
                    if (isset($item['candidates'][$item['candidate_index']])) {
                        $nextRound[] = $item;
                    } else {
                        // The legacy host occasionally drops pooled requests.
                        // Retry this source sequentially before reporting it as
                        // unavailable so transient pool failures do not leave
                        // valid images behind.
                        $remoteAsset = $this->fetchRemoteAsset(
                            $item['source'],
                            $item['relative_path'],
                        );

                        if ($remoteAsset !== null) {
                            $this->storeRemoteAsset(
                                source: $item['source'],
                                contents: $remoteAsset['contents'],
                                extension: $remoteAsset['extension'],
                            );
                        } else {
                            $this->missing[$item['source']] = true;
                            $this->sourceCache[$item['source']] = $item['source'];
                        }
                    }
                }

                unset($responses);
                gc_collect_cycles();
            }

            $pending = $nextRound;
        }
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
            self::IMAGE_SOURCE_PATTERN,
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

        $persistedSource = $this->persistedSource($source);
        if ($persistedSource !== null) {
            $this->reused++;
            $this->sourceCache[$source] = $persistedSource;

            return $persistedSource;
        }

        if ($source === '' || Str::startsWith($source, ['data:', 'blob:', '/storage/legacy-content/'])) {
            return $source;
        }

        if (preg_match('/^https?:\/\//i', $source)) {
            $host = strtolower((string) parse_url($source, PHP_URL_HOST));
            if (! $this->isAllowedLegacyHost($host)) {
                return $source;
            }
        }

        $relativePath = $this->relativePath($source);
        if ($relativePath === null) {
            $this->missing[$source] = true;

            return $source;
        }

        $sourcePath = $this->localSourcePath($relativePath);

        $contents = null;
        if ($sourcePath === null) {
            if ($this->prefetchComplete) {
                $this->missing[$source] = true;
                $this->sourceCache[$source] = $source;

                return $source;
            }

            $remoteAsset = $this->fetchRemoteAsset($source, $relativePath);

            if ($remoteAsset === null) {
                $this->missing[$source] = true;
                $this->sourceCache[$source] = $source;

                return $source;
            }

            return $this->storeRemoteAsset(
                source: $source,
                contents: $remoteAsset['contents'],
                extension: $remoteAsset['extension'],
            );
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
        $this->persistSource($source, $migratedSource);

        return $migratedSource;
    }

    /** @return array{contents: string, extension: string}|null */
    private function fetchRemoteAsset(string $source, string $relativePath): ?array
    {
        foreach ($this->remoteCandidates($source, $relativePath) as $candidate) {
            try {
                // A transfer should not block the whole request on one remote
                // image. Valid assets normally respond immediately; missing
                // assets fall through to the next candidate/fallback.
                $request = Http::connectTimeout(3)
                    ->timeout(20)
                    ->retry(3, 250, throw: false);
                if ($this->isAllowedLegacyHost(parse_url($candidate, PHP_URL_HOST))) {
                    $request = $request->withoutVerifying();
                }
                $response = $request->get($candidate);
            } catch (\Throwable) {
                continue;
            }

            $asset = $this->remoteAssetFromResponse($response, $candidate);
            if ($asset !== null) {
                return $asset;
            }
        }

        return null;
    }

    private function collectImageSources(mixed $value, array &$sources): void
    {
        if (is_array($value) || is_object($value)) {
            foreach ((array) $value as $nestedValue) {
                $this->collectImageSources($nestedValue, $sources);
            }

            return;
        }

        if (! is_string($value) || trim($value) === '') {
            return;
        }

        $html = stripos($value, '<img') === false
            ? html_entity_decode($value, ENT_QUOTES | ENT_HTML5)
            : $value;

        if (stripos($html, '<img') !== false
            && preg_match_all(self::IMAGE_SOURCE_PATTERN, $html, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $source = trim(html_entity_decode($match[3] ?? ($match[4] ?? ''), ENT_QUOTES | ENT_HTML5));
                if ($source !== '' && ! Str::startsWith($source, ['data:', 'blob:', '/storage/legacy-content/'])) {
                    $sources[$source] = true;
                }
            }
        }

        $decoded = json_decode($value, true);
        if (is_array($decoded)) {
            $this->collectImageSources($decoded, $sources);
        }
    }

    private function relativePath(string $source): ?string
    {
        $path = parse_url($source, PHP_URL_PATH);
        if (! is_string($path) || $path === '') {
            return null;
        }

        $relativePath = rawurldecode(str_replace('\\', '/', $path));
        $relativePath = preg_replace('#^/testmaker/#i', '/', $relativePath) ?? $relativePath;
        $relativePath = ltrim($relativePath, '/');

        return $relativePath === '' || str_contains($relativePath, '../')
            ? null
            : $relativePath;
    }

    private function localSourcePath(string $relativePath): ?string
    {
        $root = (string) config('legacy-transfer.asset_root', 'C:\\xampp\\htdocs\\testmaker');
        $rootPath = realpath($root);
        if ($rootPath === false) {
            return null;
        }

        $sourcePath = realpath(rtrim($root, '\\/').DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relativePath));

        if (($sourcePath === false || ! is_file($sourcePath)) && ! Str::startsWith($relativePath, 'ULC/')) {
            $fallbackRelativePath = 'ULC/'.$relativePath;
            $sourcePath = realpath(rtrim($root, '\\/').DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $fallbackRelativePath));
        }

        if ($sourcePath === false || ! is_file($sourcePath)) {
            return null;
        }

        $normalizedRoot = strtolower(str_replace('\\', '/', rtrim($rootPath, '\\/')).'/');
        $normalizedSource = strtolower(str_replace('\\', '/', $sourcePath));

        return str_starts_with($normalizedSource, $normalizedRoot)
            ? $sourcePath
            : null;
    }

    /** @return array<int, string> */
    private function remoteCandidates(string $source, string $relativePath): array
    {
        $candidates = [];
        $isAbsolute = (bool) preg_match('/^https?:\/\//i', $source);

        if ($isAbsolute) {
            $host = strtolower((string) parse_url($source, PHP_URL_HOST));
            if (! $this->isAllowedLegacyHost($host)) {
                return [];
            }

            $candidates[] = $source;
            $scheme = (string) parse_url($source, PHP_URL_SCHEME);
            $origin = $scheme.'://'.$host;
            $port = parse_url($source, PHP_URL_PORT);
            if (is_int($port)) {
                $origin .= ':'.$port;
            }
            $candidates[] = rtrim($origin, '/').'/'.ltrim($relativePath, '/');
        }

        $baseUrl = rtrim((string) config('legacy-transfer.asset_url', 'https://testmaker.pk'), '/');
        if ($baseUrl !== '') {
            $candidates[] = $baseUrl.'/'.ltrim($relativePath, '/');

            if (! Str::startsWith($relativePath, 'ULC/')) {
                $candidates[] = $baseUrl.'/ULC/'.ltrim($relativePath, '/');
            }
        }

        return array_values(array_unique($candidates));
    }

    /** @return array{contents: string, extension: string}|null */
    private function remoteAssetFromResponse(Response $response, string $candidate): ?array
    {
        if (! $response->successful()) {
            return null;
        }

        $contents = $response->body();
        if (trim($contents) === '') {
            return null;
        }

        $contentType = strtolower((string) $response->header('Content-Type'));
        if (str_contains($contentType, 'text/html')) {
            return null;
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
            'contents' => $contents,
            'extension' => $extension === '' ? '' : '.'.$extension,
        ];
    }

    private function storeRemoteAsset(string $source, string $contents, string $extension): string
    {
        $destination = 'legacy-content/'.hash('sha256', $contents).$extension;

        if (Storage::disk('public')->exists($destination)) {
            $this->reused++;
        } elseif (! Storage::disk('public')->put($destination, $contents)) {
            $this->missing[$source] = true;
            $this->sourceCache[$source] = $source;

            return $source;
        } else {
            $this->copied++;
        }

        $migratedSource = '/storage/'.$destination;
        $this->sourceCache[$source] = $migratedSource;
        $this->persistSource($source, $migratedSource);

        return $migratedSource;
    }

    private function persistedSource(string $source): ?string
    {
        $mapPath = $this->sourceMapPath($source);
        if (! Storage::disk('public')->exists($mapPath)) {
            return null;
        }

        $migratedSource = trim((string) Storage::disk('public')->get($mapPath));
        if (! Str::startsWith($migratedSource, '/storage/legacy-content/')) {
            return null;
        }

        $assetPath = Str::after($migratedSource, '/storage/');
        if (! Storage::disk('public')->exists($assetPath)) {
            Storage::disk('public')->delete($mapPath);

            return null;
        }

        return $migratedSource;
    }

    private function persistSource(string $source, string $migratedSource): void
    {
        Storage::disk('public')->put($this->sourceMapPath($source), $migratedSource);
    }

    private function sourceMapPath(string $source): string
    {
        return 'legacy-content/source-map/'.hash('sha256', $source).'.txt';
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
