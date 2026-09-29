<?php

declare(strict_types=1);
use Illuminate\Contracts\Console\Kernel;

// Run only from cPanel Cron Jobs with PHP 8.4. This file is blocked from HTTP.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);

    exit;
}

$root = dirname(__DIR__, 1);
$deploy = __DIR__;
$appRoot = $root.'/_app';
$incoming = $deploy.'/incoming';
$marker = $incoming.'/release.json';

if (! is_file($marker)) {
    exit(0);
}

$lock = fopen($deploy.'/deploy.lock', 'c');

if ($lock === false || ! flock($lock, LOCK_EX | LOCK_NB)) {
    exit(0);
}

try {
    if (PHP_VERSION_ID < 80400 || ! extension_loaded('zip') || ! function_exists('symlink')) {
        throw new RuntimeException('Cron must use PHP 8.4+ with ZIP and symlink support.');
    }

    foreach ([$deploy.'/.htaccess', $appRoot.'/.htaccess', $appRoot.'/shared/.env'] as $required) {
        if (! is_file($required)) {
            throw new RuntimeException('Missing required deployment file: '.$required);
        }
    }

    $request = json_decode((string) file_get_contents($marker), true, 512, JSON_THROW_ON_ERROR);
    $commit = $request['commit'] ?? null;
    $checksum = $request['sha256'] ?? null;
    $parts = $request['parts'] ?? null;

    if (! is_string($commit) || ! preg_match('/\A[0-9a-f]{40}\z/D', $commit)
        || ! is_string($checksum) || ! preg_match('/\A[0-9a-f]{64}\z/D', $checksum)) {
        throw new RuntimeException('Invalid release marker.');
    }

    $currentFile = $appRoot.'/current';

    if (is_file($currentFile) && trim((string) file_get_contents($currentFile)) === $commit) {
        exit(0);
    }

    $archive = prepareArchive($incoming, $commit, $checksum, $parts);

    $publicUploads = $root.'/storage';
    $storage = $appRoot.'/shared/storage';

    if (is_link($publicUploads)) {
        throw new RuntimeException('Production uploads must be a separate directory, not a symlink.');
    }

    ensureDirectory($publicUploads);
    ensureDirectory($storage.'/app');
    createLink($publicUploads, $storage.'/app/public');

    $release = $appRoot.'/releases/'.$commit;

    if (is_dir($release)) {
        if (! is_file($release.'/.ready') || trim((string) file_get_contents($release.'/.ready')) !== $checksum) {
            throw new RuntimeException('An incomplete release already exists: '.$commit);
        }
    } else {
        ensureDirectory($appRoot.'/releases');
        $stage = $appRoot.'/releases/.stage-'.$commit.'-'.bin2hex(random_bytes(4));
        ensureDirectory($stage);
        extractRelease($archive, $stage);

        foreach (['vendor/autoload.php', 'bootstrap/app.php', 'public/index.php', 'public/build/manifest.json'] as $path) {
            if (! is_file($stage.'/'.$path)) {
                throw new RuntimeException('Release is incomplete: '.$path);
            }
        }

        foreach (['app/private', 'framework/cache/data', 'framework/sessions', 'framework/views', 'logs'] as $path) {
            ensureDirectory($storage.'/'.$path);
        }

        createLink($appRoot.'/shared/.env', $stage.'/.env');
        createLink($storage, $stage.'/storage');
        createLink($publicUploads, $stage.'/public/storage');
        ensureDirectory($stage.'/bootstrap/cache');

        migrateDatabase($stage);

        file_put_contents($stage.'/.ready', $checksum."\n", LOCK_EX);

        if (! rename($stage, $release)) {
            throw new RuntimeException('Could not activate the prepared release directory.');
        }
    }

    copyPublicFiles($release.'/public', $root);
    copyAtomic($deploy.'/public.htaccess', $root.'/.htaccess');
    copyAtomic($deploy.'/front-controller.php', $root.'/index.php');
    writeAtomic($currentFile, $commit."\n");

    file_put_contents($deploy.'/deploy.log', date(DATE_ATOM).' Deployed '.$commit.PHP_EOL, FILE_APPEND | LOCK_EX);
    echo 'Deployed '.$commit.PHP_EOL;
} catch (Throwable $error) {
    file_put_contents($deploy.'/deploy.log', date(DATE_ATOM).' FAILED: '.$error->getMessage().PHP_EOL, FILE_APPEND | LOCK_EX);
    fwrite(STDERR, 'Deployment failed: '.$error->getMessage().PHP_EOL);

    exit(1);
} finally {
    flock($lock, LOCK_UN);
    fclose($lock);
}

function ensureDirectory(string $path): void
{
    if (! is_dir($path) && ! mkdir($path, 0775, true) && ! is_dir($path)) {
        throw new RuntimeException('Could not create directory: '.$path);
    }
}

function prepareArchive(string $incoming, string $commit, string $checksum, mixed $parts): string
{
    $archive = $incoming.'/release-'.$commit.'.zip';

    if (is_file($archive) && hash_equals($checksum, (string) hash_file('sha256', $archive))) {
        return $archive;
    }

    if (! is_array($parts) || ! array_is_list($parts) || count($parts) < 1 || count($parts) > 256) {
        throw new RuntimeException('Release archive is missing and its upload parts are invalid.');
    }

    $temporary = $archive.'.tmp.'.bin2hex(random_bytes(4));
    $output = fopen($temporary, 'wb');

    if ($output === false) {
        throw new RuntimeException('Could not create the release archive.');
    }

    try {
        foreach ($parts as $index => $part) {
            $expectedName = sprintf('release-%s.part%03d', $commit, $index + 1);
            $size = is_array($part) ? ($part['size'] ?? null) : null;
            $partHash = is_array($part) ? ($part['sha256'] ?? null) : null;
            $path = $incoming.'/'.$expectedName;

            if (! is_array($part) || ($part['name'] ?? null) !== $expectedName
                || ! is_int($size) || $size < 1 || $size > 8 * 1024 * 1024
                || ! is_string($partHash) || ! preg_match('/\A[0-9a-f]{64}\z/D', $partHash)
                || ! is_file($path) || filesize($path) !== $size
                || ! hash_equals($partHash, (string) hash_file('sha256', $path))) {
                throw new RuntimeException('A release upload part is missing or failed verification: '.$expectedName);
            }

            $input = fopen($path, 'rb');

            if ($input === false) {
                throw new RuntimeException('Could not read release upload part: '.$expectedName);
            }

            try {
                if (stream_copy_to_stream($input, $output) !== $size) {
                    throw new RuntimeException('Could not assemble release upload part: '.$expectedName);
                }
            } finally {
                fclose($input);
            }
        }

        fclose($output);

        if (! hash_equals($checksum, (string) hash_file('sha256', $temporary))) {
            throw new RuntimeException('Assembled release archive failed its checksum.');
        }

        if (! rename($temporary, $archive)) {
            throw new RuntimeException('Could not publish the assembled release archive.');
        }
    } catch (Throwable $error) {
        if (is_resource($output)) {
            fclose($output);
        }

        @unlink($temporary);

        throw $error;
    }

    return $archive;
}

function createLink(string $target, string $link): void
{
    if (is_link($link)) {
        if (realpath($link) === realpath($target)) {
            return;
        }

        throw new RuntimeException('An unexpected symlink exists: '.$link);
    }

    if (file_exists($link) || ! symlink($target, $link)) {
        throw new RuntimeException('Could not create symlink: '.$link);
    }
}

function extractRelease(string $archive, string $destination): void
{
    $zip = new ZipArchive;

    if ($zip->open($archive) !== true) {
        throw new RuntimeException('Could not open release archive.');
    }

    $allowed = ['app', 'artisan', 'bootstrap', 'composer.json', 'composer.lock', 'config', 'database', 'public', 'resources', 'routes', 'vendor'];
    $totalSize = 0;

    if ($zip->numFiles > 50000) {
        throw new RuntimeException('Release archive has too many files.');
    }

    for ($index = 0; $index < $zip->numFiles; $index++) {
        $name = $zip->getNameIndex($index);
        $parts = is_string($name) ? explode('/', $name) : [];
        $stat = $zip->statIndex($index);

        if ($name === false || str_contains($name, '\\') || str_starts_with($name, '/')
            || in_array('', array_slice($parts, 0, -1), true) || in_array('..', $parts, true)
            || ! in_array($parts[0] ?? '', $allowed, true) || $stat === false) {
            throw new RuntimeException('Unsafe path in release archive.');
        }

        $totalSize += (int) $stat['size'];

        if ($totalSize > 2 * 1024 * 1024 * 1024) {
            throw new RuntimeException('Release archive is too large.');
        }
    }

    if (! $zip->extractTo($destination)) {
        throw new RuntimeException('Could not extract release archive.');
    }

    $zip->close();
}

function migrateDatabase(string $release): void
{
    require_once $release.'/vendor/autoload.php';

    $previousDirectory = getcwd();
    chdir($release);

    try {
        $app = require $release.'/bootstrap/app.php';
        $kernel = $app->make(Kernel::class);

        if ($kernel->call('migrate', ['--force' => true, '--no-interaction' => true]) !== 0) {
            throw new RuntimeException('Database migration failed.');
        }
    } finally {
        chdir($previousDirectory ?: '/');
    }
}

function copyPublicFiles(string $source, string $destination): void
{
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($source, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST,
    );

    foreach ($files as $file) {
        $relative = substr($file->getPathname(), strlen($source) + 1);

        if (in_array($relative, ['index.php', '.htaccess', 'storage'], true) || $file->isLink()) {
            continue;
        }

        $target = $destination.'/'.$relative;

        if ($file->isDir()) {
            ensureDirectory($target);
        } else {
            ensureDirectory(dirname($target));
            copyAtomic($file->getPathname(), $target);
        }
    }
}

function copyAtomic(string $source, string $destination): void
{
    if (! is_file($source)) {
        throw new RuntimeException('Missing deployment template: '.$source);
    }

    $temporary = $destination.'.tmp.'.bin2hex(random_bytes(4));

    if (! copy($source, $temporary) || ! rename($temporary, $destination)) {
        @unlink($temporary);

        throw new RuntimeException('Could not publish file: '.$destination);
    }
}

function writeAtomic(string $destination, string $content): void
{
    $temporary = $destination.'.tmp.'.bin2hex(random_bytes(4));

    if (file_put_contents($temporary, $content, LOCK_EX) === false || ! rename($temporary, $destination)) {
        @unlink($temporary);

        throw new RuntimeException('Could not activate release.');
    }
}
