<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Support\LegacyTransfer\LegacyContentTransferService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class DataTransferController extends Controller
{
    public function index(LegacyContentTransferService $transfer): Response
    {
        return Inertia::render('superadmin/data-transfer', [
            'sourcePatterns' => $transfer->sourcePatterns(),
            'sourceClasses' => $transfer->sourceClasses('short_syllabus'),
            'targetCatalog' => $transfer->targetCatalog(),
            'defaults' => [
                'source_pattern' => 'short_syllabus',
                'source_class_id' => '31',
                'source_subject_ids' => ['120', '122', '116', '123'],
                'target_pattern_name' => 'PECTA',
                'target_pattern_short_name' => 'PECTA',
                'target_class_name' => '9th',
                'replace_existing' => true,
            ],
            'report' => session('data_transfer_report'),
            'transferError' => session('data_transfer_error'),
        ]);
    }

    public function catalog(Request $request, LegacyContentTransferService $transfer): JsonResponse
    {
        $sourcePattern = (string) $request->query('source_pattern', 'short_syllabus');
        $sourceClassId = $request->integer('source_class_id');

        return response()->json([
            'source_patterns' => $transfer->sourcePatterns(),
            'source_classes' => $transfer->sourceClasses($sourcePattern),
            'source_subjects' => $sourceClassId > 0
                ? $transfer->sourceSubjects($sourcePattern, $sourceClassId)
                : [],
            'target_catalog' => $transfer->targetCatalog(),
        ]);
    }

    public function store(Request $request, LegacyContentTransferService $transfer): RedirectResponse
    {
        $validated = $request->validate([
            'source_pattern' => ['required', 'string'],
            'source_class_id' => ['required', 'integer'],
            'source_subject_ids' => ['required', 'array', 'min:1'],
            'source_subject_ids.*' => ['integer'],
            'target_pattern_id' => ['nullable', 'integer', 'exists:patterns,id'],
            'target_pattern_name' => ['nullable', 'string', 'max:100', 'required_without:target_pattern_id'],
            'target_pattern_short_name' => ['nullable', 'string', 'max:50'],
            'target_class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'target_class_name' => ['nullable', 'string', 'max:50', 'required_without:target_class_id'],
            'replace_existing' => ['nullable', 'boolean'],
        ]);

        try {
            $report = $transfer->transfer($validated, $request->user()?->id);
        } catch (RuntimeException $exception) {
            return back()->with('data_transfer_error', $exception->getMessage());
        }

        return back()
            ->with('success', 'Data transfer completed successfully.')
            ->with('data_transfer_report', $report);
    }
}
