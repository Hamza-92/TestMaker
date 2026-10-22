<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Export\TestbaseExportService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class TestbaseExportController extends Controller
{
    public function __construct(private readonly TestbaseExportService $export) {}

    public function capabilities(): JsonResponse
    {
        return response()->json($this->export->envelope() + [
            'payloadFormat' => 'testbase-question/1',
            'features' => ['revisionGuard' => true, 'assets' => true],
        ]);
    }

    public function catalog(Request $request): JsonResponse
    {
        return $this->execute(function () use ($request): array {
            $input = $this->query($request, [
                'patternId' => ['sometimes', 'required', 'integer', 'min:1'],
                'classId' => ['sometimes', 'required', 'integer', 'min:1'],
            ]);

            return $this->export->catalog(
                isset($input['patternId']) ? (int) $input['patternId'] : null,
                isset($input['classId']) ? (int) $input['classId'] : null,
            );
        });
    }

    public function scope(Request $request): JsonResponse
    {
        return $this->execute(function () use ($request): array {
            $input = $this->scopeQuery($request, false);

            return $this->export->snapshot($input['scope'], $input['revision'])['manifest'];
        });
    }

    public function questions(Request $request): JsonResponse
    {
        return $this->execute(function () use ($request): array {
            $input = $this->scopeQuery($request, true, [
                'pageSize' => ['required', 'integer', 'between:1,25'],
                'cursor' => ['sometimes', 'required', 'string', 'max:1000'],
            ]);
            $snapshot = $this->export->snapshot($input['scope'], $input['revision']);
            $cursor = null;
            if (isset($input['extra']['cursor'])) {
                $decoded = base64_decode(strtr($input['extra']['cursor'], '-_', '+/'), true);
                if (! is_string($decoded) || ! preg_match('/^[1-9][0-9]*$/', $decoded)) {
                    abort(422, 'Invalid question cursor.');
                }
                $cursor = (int) $decoded;
            }
            $rows = array_values(array_filter($snapshot['questions'],
                fn ($row) => $cursor === null || (int) $row['id'] > $cursor));
            $size = (int) $input['extra']['pageSize'];
            $page = array_slice($rows, 0, $size);
            $nextCursor = count($rows) > $size
                ? rtrim(strtr(base64_encode(end($page)['id']), '+/', '-_'), '=') : null;
            // A second read prevents a successful response after a concurrent edit.
            $this->export->snapshot($input['scope'], $input['revision']);

            return $this->export->envelope() + [
                'revision' => $input['revision'],
                'totalCount' => $snapshot['manifest']['questionCount'],
                'nextCursor' => $nextCursor,
                'items' => $page,
            ];
        });
    }

    public function asset(Request $request, string $assetId): Response|JsonResponse
    {
        try {
            if (! preg_match('/^asset-[a-f0-9]{64}$/', $assetId)) {
                abort(404, 'Asset not found.');
            }
            $input = $this->scopeQuery($request, true);
            $snapshot = $this->export->snapshot($input['scope'], $input['revision']);
            $asset = collect($snapshot['manifest']['assets'])->firstWhere('id', $assetId);
            if (! $asset || ! $asset['available'] || ! isset($snapshot['assetBytes'][$assetId])) {
                abort(404, 'Asset not found in this scope.');
            }
            $bytes = $snapshot['assetBytes'][$assetId];
            $this->export->snapshot($input['scope'], $input['revision']);
            if (! hash_equals($asset['sha256'], hash('sha256', $bytes))) {
                abort(409, 'Source image changed.');
            }

            return response($bytes, 200, ['Content-Type' => $asset['mime']]);
        } catch (Throwable $exception) {
            return $this->error($exception);
        }
    }

    private function scopeQuery(Request $request, bool $revisionRequired, array $extra = []): array
    {
        $input = $this->query($request, [
            'patternId' => ['required', 'integer', 'min:1'],
            'classId' => ['required', 'integer', 'min:1'],
            'subjectId' => ['required', 'integer', 'min:1'],
            'revision' => [$revisionRequired ? 'required' : 'sometimes', 'regex:/^[a-f0-9]{64}$/'],
        ] + $extra);

        return [
            'scope' => [
                'patternId' => (int) $input['patternId'],
                'classId' => (int) $input['classId'],
                'subjectId' => (int) $input['subjectId'],
            ],
            'revision' => $input['revision'] ?? null,
            'extra' => $input,
        ];
    }

    private function query(Request $request, array $rules): array
    {
        $query = $request->query();
        if (array_diff(array_keys($query), array_keys($rules)) !== []) {
            abort(422, 'Unknown export query field.');
        }
        $validator = Validator::make($query, $rules);
        if ($validator->fails()) {
            abort(422, 'Invalid export query.');
        }

        return $validator->validated();
    }

    private function execute(callable $callback): JsonResponse
    {
        try {
            return response()->json($callback());
        } catch (Throwable $exception) {
            return $this->error($exception);
        }
    }

    private function error(Throwable $exception): JsonResponse
    {
        $status = $exception instanceof ModelNotFoundException ? 404 :
            ($exception instanceof HttpExceptionInterface ? $exception->getStatusCode() : 503);
        $message = $exception instanceof ModelNotFoundException ? 'Scope not found.' :
            ($exception instanceof HttpExceptionInterface && $exception->getMessage() !== ''
                ? $exception->getMessage() : 'Export is unavailable.');

        return response()->json(['message' => $message], $status);
    }
}
