<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Support\LegacyTransfer\LegacyExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Throwable;

class LegacyExportController extends Controller
{
    public function index(LegacyExportService $export): Response
    {
        return Inertia::render('superadmin/legacy-export', [
            'history' => $export->history(),
        ]);
    }

    public function catalog(Request $request, LegacyExportService $export): JsonResponse
    {
        $filter = $request->validate([
            'mode' => ['nullable', Rule::in(['subject', 'chapters', 'topics', 'question_types', 'questions'])],
            'include_legacy' => ['nullable', 'boolean'],
            'pattern_id' => ['nullable', 'integer', 'min:1'],
            'class_id' => ['nullable', 'integer', 'min:1'],
            'subject_id' => ['nullable', 'integer', 'min:1'],
            'afaq' => ['nullable', 'integer', 'between:0,9'],
            'legacy_class_id' => ['nullable', 'integer', 'min:1'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', Rule::in([50, 100, 200])],
            'chapter_id' => ['nullable', 'integer', 'min:1'],
            'topic_id' => ['nullable', 'integer', 'min:1'],
            'question_type_id' => ['nullable', 'integer', 'min:1'],
        ]);

        return response()->json($export->catalog($filter));
    }

    public function preview(Request $request, LegacyExportService $export): JsonResponse
    {
        try {
            return response()->json($export->preview($this->selection($request)));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function store(Request $request, LegacyExportService $export): JsonResponse
    {
        $selection = $this->selection($request);
        set_time_limit(0);

        try {
            $report = $export->export($selection, $request->user()?->id);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['message' => 'Export failed. No further items were processed. Check the application log before retrying.'], 500);
        }

        return response()->json(['report' => $report]);
    }

    private function selection(Request $request): array
    {
        $validated = $request->validate([
            'pattern_id' => ['required', 'integer', 'exists:patterns,id'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'legacy_afaq' => ['required', 'integer', 'between:0,9'],
            'legacy_class_id' => ['required', 'integer', 'min:1'],
            'legacy_subject_id' => ['required', 'integer', 'min:1'],
            'mode' => ['required', Rule::in(['subject', 'chapters', 'topics', 'question_types', 'questions'])],
            'ids' => [Rule::excludeIf($request->input('mode') === 'subject'), 'required', 'array', 'min:1', 'max:2000'],
            'ids.*' => ['integer', 'min:1', 'distinct'],
            'replace_existing' => ['nullable', 'boolean'],
            'legacy_type_ids' => ['nullable', 'array'],
            'legacy_type_ids.*' => ['integer', 'min:1'],
        ]);
        $validated['ids'] ??= [];
        $validated['replace_existing'] ??= false;
        $validated['legacy_type_ids'] ??= [];

        return $validated;
    }
}
