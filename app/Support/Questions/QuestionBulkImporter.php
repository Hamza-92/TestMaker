<?php

namespace App\Support\Questions;

use App\Enums\AuditEvent;
use App\Models\AuditLog;
use App\Models\Chapter;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\Topic;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Exception as ReaderException;

class QuestionBulkImporter
{
    private const MAX_ROWS = 1000;

    private const MAX_ERROR_MESSAGES = 60;

    private const PREVIEW_ROW_LIMIT = 25;

    public function preview(
        UploadedFile $file,
        QuestionType $questionType,
        Chapter $chapter,
        ?Topic $topic,
        ?string $defaultSource,
        int $defaultStatus,
    ): array {
        [$rows, $optionIndexes, $headerErrors] = $this->readRows($file);

        if ($headerErrors !== []) {
            return $this->previewReport(
                status: 'error',
                totalRows: 0,
                readyRows: 0,
                failedRows: 0,
                errors: $headerErrors,
                rows: [],
                records: [],
            );
        }

        $errors = [];
        $overflowErrors = 0;
        $records = [];
        $failedRows = 0;
        $totalRows = count($rows);

        if ($totalRows === 0) {
            return $this->previewReport(
                status: 'error',
                totalRows: 0,
                readyRows: 0,
                failedRows: 0,
                errors: ['The file has no importable rows.'],
                rows: [],
                records: [],
            );
        }

        foreach ($rows as $row) {
            $issues = $this->validateRow(
                row: $row['data'],
                rowNumber: $row['number'],
                optionIndexes: $optionIndexes,
                questionType: $questionType,
                chapter: $chapter,
                topic: $topic,
                defaultSource: $defaultSource,
                defaultStatus: $defaultStatus,
            );

            if ($issues['errors'] !== []) {
                $failedRows++;

                foreach ($issues['errors'] as $message) {
                    if (count($errors) < self::MAX_ERROR_MESSAGES) {
                        $errors[] = $message;

                        continue;
                    }

                    $overflowErrors++;
                }

                continue;
            }

            $records[] = [
                'row_number' => $row['number'],
                ...$issues['record'],
            ];
        }

        if ($overflowErrors > 0) {
            $errors[] = "{$overflowErrors} additional errors were omitted.";
        }

        return $this->previewReport(
            status: $errors === [] ? 'success' : 'error',
            totalRows: $totalRows,
            readyRows: count($records),
            failedRows: $failedRows,
            errors: $errors,
            rows: $this->buildPreviewRows($records),
            records: $errors === [] ? $records : [],
        );
    }

    public function import(
        UploadedFile $file,
        QuestionType $questionType,
        Chapter $chapter,
        ?Topic $topic,
        ?string $defaultSource,
        int $defaultStatus,
        int $creatorId,
    ): array {
        $preview = $this->preview(
            file: $file,
            questionType: $questionType,
            chapter: $chapter,
            topic: $topic,
            defaultSource: $defaultSource,
            defaultStatus: $defaultStatus,
        );

        if ($preview['status'] !== 'success') {
            return $this->importReport(
                status: 'error',
                totalRows: $preview['total_rows'],
                importedRows: 0,
                failedRows: $preview['failed_rows'],
                errors: $preview['errors'],
            );
        }

        return $this->importRecords(
            records: $preview['records'],
            questionType: $questionType,
            chapter: $chapter,
            topic: $topic,
            creatorId: $creatorId,
        );
    }

    public function importRecords(
        array $records,
        QuestionType $questionType,
        Chapter $chapter,
        ?Topic $topic,
        int $creatorId,
    ): array {
        DB::transaction(function () use ($creatorId, $questionType, $chapter, $topic, $records): void {
            foreach ($records as $record) {
                $question = Question::query()->create([
                    ...$record['payload'],
                    'created_by' => $creatorId,
                ]);

                if ($record['options'] !== []) {
                    $question->options()->createMany($record['options']);
                }

                AuditLog::record(
                    model: $question,
                    event: AuditEvent::Created,
                    newValues: [
                        'question_type' => $questionType->name,
                        'chapter' => $chapter->name,
                        'subject' => $chapter->subject?->name_eng,
                        'topic' => $topic?->name,
                        'source' => $record['payload']['source'],
                        'status' => $record['payload']['status'],
                        'options_count' => count($record['options']),
                    ],
                    notes: 'Question imported.',
                );
            }
        });

        return $this->importReport(
            status: 'success',
            totalRows: count($records),
            importedRows: count($records),
            failedRows: 0,
            errors: [],
        );
    }

    public function templateHeaders(): array
    {
        return [
            'statement_en',
            'statement_ur',
            'description_en',
            'description_ur',
            'answer_en',
            'answer_ur',
            'source',
            'status',
            'option_1_en',
            'option_1_ur',
            'option_1_correct',
            'option_2_en',
            'option_2_ur',
            'option_2_correct',
            'option_3_en',
            'option_3_ur',
            'option_3_correct',
            'option_4_en',
            'option_4_ur',
            'option_4_correct',
        ];
    }

    private function readRows(UploadedFile $file): array
    {
        try {
            $reader = IOFactory::createReaderForFile($file->getRealPath());
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($file->getRealPath());
        } catch (ReaderException) {
            return [[], [], ['The file could not be read.']];
        }

        $rawRows = $spreadsheet->getActiveSheet()->toArray(
            null,
            true,
            true,
            false,
        );

        $rawHeaders = $rawRows[0] ?? null;

        if (! is_array($rawHeaders) || $rawHeaders === []) {
            return [[], [], ['The file header row is missing.']];
        }

        $headers = collect($rawHeaders)
            ->map(fn ($header) => $this->normalizeHeader($header))
            ->all();

        $duplicateHeaders = collect($headers)
            ->filter(fn ($header) => $header !== '')
            ->duplicates()
            ->unique()
            ->values()
            ->all();

        if ($duplicateHeaders !== []) {
            return [[], [], ['The file contains duplicate column names.']];
        }

        $rows = [];

        foreach (array_slice($rawRows, 1) as $index => $values) {
            if (! is_array($values)) {
                continue;
            }

            $row = [];

            foreach ($headers as $position => $header) {
                if ($header === '') {
                    continue;
                }

                $row[$header] = $this->normalizeNullableString($values[$position] ?? null);
            }

            if ($this->isEmptyRow($row)) {
                continue;
            }

            $rows[] = [
                'number' => $index + 2,
                'data' => $row,
            ];
        }

        if (count($rows) > self::MAX_ROWS) {
            return [[], [], ['The file exceeds the 1000 row import limit.']];
        }

        return [$rows, $this->detectOptionIndexes($headers), []];
    }

    private function validateRow(
        array $row,
        int $rowNumber,
        array $optionIndexes,
        QuestionType $questionType,
        Chapter $chapter,
        ?Topic $topic,
        ?string $defaultSource,
        int $defaultStatus,
    ): array {
        $errors = [];
        $sourceInput = $row['source'] ?? null;
        $source = $sourceInput !== null
            ? Question::normalizeSource($sourceInput)
            : $defaultSource;
        $statusInput = $row['status'] ?? null;
        $status = $statusInput !== null
            ? $this->normalizeStatus($statusInput)
            : $defaultStatus;

        if ($sourceInput !== null && $source === null) {
            $errors[] = "Row {$rowNumber}: Source is invalid.";
        }

        if ($status === null) {
            $errors[] = "Row {$rowNumber}: Status is invalid.";
        }

        $statementEn = $row['statement_en'] ?? null;
        $statementUr = $row['statement_ur'] ?? null;
        $descriptionEn = $row['description_en'] ?? null;
        $descriptionUr = $row['description_ur'] ?? null;
        $answerEn = $row['answer_en'] ?? null;
        $answerUr = $row['answer_ur'] ?? null;

        if ($questionType->have_statement && $statementEn === null && $statementUr === null) {
            $errors[] = "Row {$rowNumber}: Statement is required.";
        }

        if ($questionType->have_description && $descriptionEn === null && $descriptionUr === null) {
            $errors[] = "Row {$rowNumber}: Description is required.";
        }

        if (! $questionType->is_objective && $questionType->have_answer && $answerEn === null && $answerUr === null) {
            $errors[] = "Row {$rowNumber}: Answer is required.";
        }

        $options = [];

        if ($questionType->is_objective) {
            foreach ($optionIndexes as $index) {
                $textEn = $row["option_{$index}_en"] ?? null;
                $textUr = $row["option_{$index}_ur"] ?? null;
                $correctInput = $row["option_{$index}_correct"] ?? null;
                $isCorrect = $this->normalizeOptionCorrect($correctInput);

                if ($correctInput !== null && $isCorrect === null) {
                    $errors[] = "Row {$rowNumber}: Option {$index} correct flag is invalid.";
                }

                if ($textEn === null && $textUr === null) {
                    if ($isCorrect) {
                        $errors[] = "Row {$rowNumber}: Option {$index} is marked correct without text.";
                    }

                    continue;
                }

                $options[] = [
                    'text_en' => $textEn,
                    'text_ur' => $textUr,
                    'is_correct' => (bool) $isCorrect,
                    'sort_order' => count($options) + 1,
                ];
            }

            if (count($options) < 2) {
                $errors[] = "Row {$rowNumber}: At least two options are required.";
            }

            $correctCount = collect($options)->where('is_correct', true)->count();

            if ($correctCount < 1) {
                $errors[] = "Row {$rowNumber}: Select at least one correct option.";
            }

            if ($questionType->is_single && $correctCount !== 1) {
                $errors[] = "Row {$rowNumber}: Single objective questions require exactly one correct option.";
            }
        }

        if ($errors !== []) {
            return ['errors' => $errors];
        }

        return [
            'errors' => [],
            'record' => [
                'payload' => [
                    'question_type_id' => $questionType->id,
                    'chapter_id' => $chapter->id,
                    'topic_id' => $chapter->subject?->subject_type === 'topic-wise'
                        ? $topic?->id
                        : null,
                    'statement_en' => $questionType->have_statement ? $statementEn : null,
                    'statement_ur' => $questionType->have_statement ? $statementUr : null,
                    'description_en' => $questionType->have_description ? $descriptionEn : null,
                    'description_ur' => $questionType->have_description ? $descriptionUr : null,
                    'answer_en' => ! $questionType->is_objective && $questionType->have_answer ? $answerEn : null,
                    'answer_ur' => ! $questionType->is_objective && $questionType->have_answer ? $answerUr : null,
                    'source' => $source,
                    'status' => $status,
                ],
                'options' => $options,
            ],
        ];
    }

    private function normalizeHeader(mixed $value): string
    {
        $normalized = trim((string) $value);
        $normalized = preg_replace('/^\xEF\xBB\xBF/', '', $normalized) ?? $normalized;
        $normalized = strtolower($normalized);

        return preg_replace('/[^a-z0-9]+/', '_', $normalized) ?? '';
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }

    private function normalizeStatus(?string $value): ?int
    {
        if ($value === null) {
            return null;
        }

        return match (strtolower(trim($value))) {
            '1', 'true', 'yes', 'active', 'enabled' => 1,
            '0', 'false', 'no', 'inactive', 'disabled' => 0,
            default => null,
        };
    }

    private function normalizeOptionCorrect(?string $value): ?bool
    {
        if ($value === null) {
            return false;
        }

        return match (strtolower(trim($value))) {
            '', '0', 'false', 'no', 'n' => false,
            '1', 'true', 'yes', 'y' => true,
            default => null,
        };
    }

    private function isEmptyRow(array $row): bool
    {
        foreach ($row as $value) {
            if ($value !== null) {
                return false;
            }
        }

        return true;
    }

    private function detectOptionIndexes(array $headers): array
    {
        return collect($headers)
            ->map(function (string $header) {
                if (! preg_match('/^option_(\d+)_(en|ur|correct)$/', $header, $matches)) {
                    return null;
                }

                return (int) $matches[1];
            })
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    private function buildPreviewRows(array $records): array
    {
        return collect($records)
            ->take(self::PREVIEW_ROW_LIMIT)
            ->map(fn (array $record) => [
                'row_number' => $record['row_number'],
                'statement_en' => $record['payload']['statement_en'],
                'statement_ur' => $record['payload']['statement_ur'],
                'description_en' => $record['payload']['description_en'],
                'description_ur' => $record['payload']['description_ur'],
                'answer_en' => $record['payload']['answer_en'],
                'answer_ur' => $record['payload']['answer_ur'],
                'source' => $record['payload']['source'],
                'status' => $record['payload']['status'],
                'options' => $record['options'],
            ])
            ->values()
            ->all();
    }

    private function previewReport(
        string $status,
        int $totalRows,
        int $readyRows,
        int $failedRows,
        array $errors,
        array $rows,
        array $records,
    ): array {
        return [
            'status' => $status,
            'total_rows' => $totalRows,
            'ready_rows' => $readyRows,
            'failed_rows' => $failedRows,
            'errors' => $errors,
            'rows' => $rows,
            'records' => $records,
        ];
    }

    private function importReport(
        string $status,
        int $totalRows,
        int $importedRows,
        int $failedRows,
        array $errors,
    ): array {
        return [
            'status' => $status,
            'total_rows' => $totalRows,
            'imported_rows' => $importedRows,
            'failed_rows' => $failedRows,
            'errors' => $errors,
        ];
    }
}
