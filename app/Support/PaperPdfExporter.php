<?php

namespace App\Support;

use App\Http\Controllers\Customer\GeneratePaperController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Inertia\Inertia;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\Process\Process;

class PaperPdfExporter
{
    public function download(Request $request, array $paperData, string $name): BinaryFileResponse
    {
        $token = (string) Str::uuid();
        $directory = storage_path('app/private/paper-pdfs');
        $htmlPath = $directory.DIRECTORY_SEPARATOR.$token.'.html';
        $outputPath = $directory.DIRECTORY_SEPARATOR.$token.'.pdf';
        $timeoutSeconds = max(30, (int) config('paper-pdf.timeout', 120));

        File::ensureDirectoryExists($directory);
        File::put($htmlPath, $this->renderPaperHtml($request, $paperData, $name));

        $rendererInput = json_encode([
            'htmlPath' => $htmlPath,
            'baseUrl' => $request->getSchemeAndHttpHost(),
            'publicPath' => public_path(),
            'outputPath' => $outputPath,
            'browserPath' => config('paper-pdf.browser_path'),
            'timeoutMs' => $timeoutSeconds * 1000,
        ], JSON_THROW_ON_ERROR);

        try {
            $this->runRenderer($rendererInput, $outputPath, $timeoutSeconds);
        } catch (\Throwable $exception) {
            File::delete($outputPath);

            throw new RuntimeException(
                $exception->getMessage() ?: 'The PDF could not be generated.',
                previous: $exception,
            );
        } finally {
            File::delete($htmlPath);
        }

        if (! File::exists($outputPath) || File::size($outputPath) === 0) {
            File::delete($outputPath);

            throw new RuntimeException('The PDF renderer did not produce a file.');
        }

        return response()
            ->download($outputPath, $this->downloadName($name))
            ->deleteFileAfterSend(true);
    }

    private function runRenderer(string $input, string $outputPath, int $timeoutSeconds): void
    {
        $lastError = 'The PDF could not be generated.';

        for ($attempt = 1; $attempt <= 3; $attempt++) {
            File::delete($outputPath);

            $process = new Process([
                (string) config('paper-pdf.node_path', 'node'),
                base_path('scripts/render-paper-pdf.mjs'),
            ], base_path(), $this->rendererEnvironment());
            $process->setTimeout($timeoutSeconds + 10);
            $process->setInput($input);
            $process->run();

            if ($process->isSuccessful()) {
                return;
            }

            $lastError = trim($process->getErrorOutput()) ?: $lastError;

            if (! str_contains($lastError, 'ncrypto::CSPRNG')) {
                break;
            }
        }

        throw new RuntimeException($lastError);
    }

    /** @return array<string, string> */
    private function rendererEnvironment(): array
    {
        if (DIRECTORY_SEPARATOR !== '\\') {
            return [];
        }

        $windowsDirectory = getenv('SystemRoot') ?: getenv('SYSTEMROOT') ?: 'C:\\Windows';
        $temporaryDirectory = getenv('TEMP') ?: getenv('TMP') ?: sys_get_temp_dir();

        return [
            'SystemRoot' => $windowsDirectory,
            'SYSTEMROOT' => $windowsDirectory,
            'ComSpec' => getenv('ComSpec') ?: $windowsDirectory.'\\System32\\cmd.exe',
            'TEMP' => $temporaryDirectory,
            'TMP' => $temporaryDirectory,
        ];
    }

    private function renderPaperHtml(Request $request, array $paperData, string $name): string
    {
        $paper = $paperData['paper'] ?? null;

        if (! is_array($paper)) {
            throw new RuntimeException('The paper data is incomplete.');
        }

        $savedPaper = [
            'id' => 0,
            'name' => $name,
            'is_draft' => false,
            'paper' => $paper,
            'questionPoolsByType' => [],
            'questionSelection' => $paperData['questionSelection'] ?? null,
            'chapterSelection' => $paperData['chapterSelection'] ?? null,
            'meta' => $paperData['meta'] ?? null,
            'pdfState' => $paperData['pdfState'] ?? null,
        ];
        $htmlRequest = $request->duplicate();
        $htmlRequest->headers->remove('X-Inertia');
        $htmlRequest->headers->set('Accept', 'text/html');

        $response = Inertia::render('customer/papers/generate', array_merge(
            GeneratePaperController::pageData(),
            [
                'savedPaper' => $savedPaper,
                'pdfExport' => true,
            ],
        ))->toResponse($htmlRequest);
        $html = (string) $response->getContent();
        $baseUrl = htmlspecialchars(
            rtrim($request->getSchemeAndHttpHost(), '/').'/',
            ENT_QUOTES | ENT_SUBSTITUTE,
            'UTF-8',
        );

        $html = preg_replace(
            '/\s*<link[^>]+fonts\.bunny\.net[^>]*>/i',
            '',
            $html,
        ) ?? $html;

        return str_replace('<head>', '<head><base href="'.$baseUrl.'">', $html);
    }

    private function downloadName(string $name): string
    {
        $filename = Str::slug(Str::ascii($name));

        return ($filename !== '' ? $filename : 'paper').'.pdf';
    }
}
