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
            'targetPatterns' => $transfer->targetPatterns(),
            'defaults' => [
                'source_pattern' => 'short_syllabus',
            ],
            'report' => session('data_transfer_report'),
            'transferError' => session('data_transfer_error'),
        ]);
    }

    public function catalog(Request $request, LegacyContentTransferService $transfer): JsonResponse
    {
        $sourcePattern = (string) $request->query('source_pattern', 'short_syllabus');
        $sourceClassId = $request->integer('source_class_id');
        $sourceSubjectId = $request->integer('source_subject_id');
        $targetPatternId = $request->integer('target_pattern_id');
        $targetClassId = $request->integer('target_class_id');

        return response()->json([
            'source_patterns' => $transfer->sourcePatterns(),
            'source_classes' => $transfer->sourceClasses($sourcePattern),
            'source_subjects' => $sourceClassId > 0
                ? $transfer->sourceSubjects($sourcePattern, $sourceClassId)
                : [],
            'source_chapters' => $sourceClassId > 0 && $sourceSubjectId > 0
                ? $transfer->sourceChapters($sourcePattern, $sourceClassId, $sourceSubjectId)
                : [],
            'target_patterns' => $transfer->targetPatterns(),
            'target_classes' => $transfer->targetClasses($targetPatternId),
            'target_subjects' => $transfer->targetSubjects($targetPatternId, $targetClassId),
        ]);
    }

    public function store(Request $request, LegacyContentTransferService $transfer): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'source_pattern' => ['required', 'string'],
            'source_class_id' => ['required', 'integer'],
            'source_subject_id' => ['nullable', 'integer'],
            'source_subject_ids' => ['nullable', 'array', 'min:1'],
            'source_subject_ids.*' => ['integer'],
            'source_chapter_ids' => ['nullable', 'array'],
            'source_chapter_ids.*' => ['integer'],
            'source_topic_ids' => ['nullable', 'array'],
            'source_topic_ids.*' => ['integer'],
            'target_pattern_id' => ['nullable', 'integer', 'exists:patterns,id'],
            'target_pattern_name' => ['nullable', 'string', 'max:100', 'required_without:target_pattern_id'],
            'target_pattern_short_name' => ['nullable', 'string', 'max:50'],
            'target_class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'target_class_name' => ['nullable', 'string', 'max:50', 'required_without:target_class_id'],
            'target_subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'replace_existing' => ['nullable', 'boolean'],
        ]);

        try {
            $report = $transfer->transfer($validated, $request->user()?->id);
        } catch (RuntimeException $exception) {
            if ($request->expectsJson()) {
                return response()->json(['message' => $exception->getMessage()], 422);
            }

            return back()->with('data_transfer_error', $exception->getMessage());
        }

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Data transfer completed successfully.',
                'report' => $report,
            ]);
        }

        return back()
            ->with('success', 'Data transfer completed successfully.')
            ->with('data_transfer_report', $report);
    }
}
