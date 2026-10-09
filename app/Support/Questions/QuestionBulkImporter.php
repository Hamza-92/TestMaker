<?php

namespace App\Support\Questions;

use App\Enums\AuditEvent;
use App\Models\AuditLog;
use App\Models\Chapter;
use App\Models\Medium;
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

    public const PREVIEW_PAGE_SIZE = 25;

    private ?int $bothMediumId = null;

    private bool $mediumResolved = false;

    public function preview(
        UploadedFile $file,
        QuestionType $questionType,
        Chapter $chapter,
        ?Topic $topic,
        ?string $defaultSource,
        int $defaultStatus,
        ?int $mediumId = null,
    ): array {
        if (! QuestionTypeSchemaRegistry::supportsSimpleImport($questionType)) {
            return $this->previewReport(
                status: 'error',
                totalRows: 0,
                readyRows: 0,
                failedRows: 0,
                errors: ['Bulk import currently supports only simple single-prompt question types.'],
                rows: [],
                records: [],
            );
        }

        [$rows, $optionIndexes, $headerErrors] = $this->readRows($file, $questionType);

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
        $previewRows = [];
        $seenSignatures = [];
        $existingSignatures = $this->existingSignatures($questionType, $chapter, $topic, $rows);
        $failedRows = 0;
        $duplicateRows = 0;
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
                mediumId: $mediumId,
            );

            if ($issues['errors'] === []) {
                $signature = $this->contentSignature($issues['record']['payload']['content']);

                if (isset($seenSignatures[$signature])) {
                    $issues['errors'][] = "Row {$row['number']}: Duplicate of row {$seenSignatures[$signature]}.";
                    $duplicateRows++;
                } elseif (isset($existingSignatures[$signature])) {
                    $issues['errors'][] = "Row {$row['number']}: This question already exists in the selected chapter and question type.";
                    $duplicateRows++;
                } else {
                    $seenSignatures[$signature] = $row['number'];
                }
            }

            $previewRows[] = $this->buildPreviewRow($row, $optionIndexes, $issues);

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
            status: $records === [] ? 'error' : 'success',
            totalRows: $totalRows,
            readyRows: count($records),
            failedRows: $failedRows,
            errors: $errors,
            rows: $previewRows,
            records: $records,
            duplicateRows: $duplicateRows,
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
        ?int $mediumId = null,
    ): array {
        if (! QuestionTypeSchemaRegistry::supportsSimpleImport($questionType)) {
            return $this->importReport(
                status: 'error',
                totalRows: 0,
                importedRows: 0,
                failedRows: 0,
                errors: ['Bulk import currently supports only simple single-prompt question types.'],
            );
        }

        $preview = $this->preview(
            file: $file,
            questionType: $questionType,
            chapter: $chapter,
            topic: $topic,
            defaultSource: $defaultSource,
            defaultStatus: $defaultStatus,
            mediumId: $mediumId,
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
        int $totalRows = 0,
        int $failedRows = 0,
        int $unselectedRows = 0,
        int $previewDuplicateRows = 0,
    ): array {
        if (! QuestionTypeSchemaRegistry::supportsSimpleImport($questionType)) {
            return $this->importReport(
                status: 'error',
                totalRows: 0,
                importedRows: 0,
                failedRows: 0,
                errors: ['Bulk import currently supports only simple single-prompt question types.'],
            );
        }

        $existingSignatures = $this->existingSignatures($questionType, $chapter, $topic, $records, true);
        $uniqueRecords = [];
        $newDuplicateRows = 0;

        foreach ($records as $record) {
            $signature = $this->contentSignature($record['payload']['content']);

            if (isset($existingSignatures[$signature])) {
                $newDuplicateRows++;

                continue;
            }

            $existingSignatures[$signature] = true;
            $uniqueRecords[] = $record;
        }

        DB::transaction(function () use ($creatorId, $questionType, $chapter, $topic, $uniqueRecords): void {
            foreach ($uniqueRecords as $record) {
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
            status: $uniqueRecords === [] ? 'error' : 'success',
            totalRows: $totalRows ?: count($records),
            importedRows: count($uniqueRecords),
            failedRows: $failedRows,
            errors: $uniqueRecords === [] ? ['No selected questions were imported; they already exist.'] : [],
            unselectedRows: $unselectedRows,
            duplicateRows: $previewDuplicateRows + $newDuplicateRows,
        );
    }

    public function templateHeaders(QuestionType $questionType): array
    {
        $schema = QuestionTypeSchemaRegistry::resolve($questionType->schema_key, $questionType->is_objective, [
            'objective_type_id' => $questionType->objective_type_id,
            'have_description' => $questionType->have_description,
            'have_answer' => $questionType->have_answer,
        ]);
        $headers = $questionType->options_only ? [] : ['statement_en', 'statement_ur'];

        if (in_array($schema['key'], [QuestionTypeSchemaRegistry::OBJECTIVE_MCQ, QuestionTypeSchemaRegistry::OBJECTIVE_BLANK_CHOICE], true)) {
            foreach (range(1, 4) as $index) {
                array_push($headers, "option_{$index}_en", "option_{$index}_ur", "option_{$index}_correct");
            }

            return $headers;
        }

        if (in_array($schema['key'], [QuestionTypeSchemaRegistry::SUBJECTIVE_STANDARD, QuestionTypeSchemaRegistry::SUBJECTIVE_SAME_STATEMENT], true)
            && ($questionType->have_description || $schema['key'] === QuestionTypeSchemaRegistry::SUBJECTIVE_SAME_STATEMENT)) {
            array_push($headers, 'description_en', 'description_ur');
        }

        if ($questionType->have_answer || in_array($schema['key'], [QuestionTypeSchemaRegistry::OBJECTIVE_TRUE_FALSE, QuestionTypeSchemaRegistry::OBJECTIVE_BLANK_OPEN], true)) {
            array_push($headers, 'answer_en', 'answer_ur');
        }

        return $headers;
    }

    private function readRows(UploadedFile $file, QuestionType $questionType): array
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
            false,
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

        $allowedHeaders = $this->templateHeaders($questionType);

        if (in_array('option_1_en', $allowedHeaders, true)) {
            foreach ([5, 6] as $index) {
                array_push($allowedHeaders, "option_{$index}_en", "option_{$index}_ur", "option_{$index}_correct");
            }
        }

        $unknownHeaders = array_values(array_diff(array_filter($headers), $allowedHeaders));

        if ($unknownHeaders !== []) {
            return [[], [], ['Remove unsupported columns: '.implode(', ', $unknownHeaders).'. Select source, status, and medium in the form.']];
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
        ?int $mediumId,
    ): array {
        $errors = [];
        $schema = QuestionTypeSchemaRegistry::resolve($questionType->schema_key, $questionType->is_objective, [
            'objective_type_id' => $questionType->objective_type_id,
            'have_description' => $questionType->have_description,
            'have_answer' => $questionType->have_answer,
        ]);
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

        if ($questionType->have_statement && ! $questionType->options_only && $statementEn === null && $statementUr === null) {
            $errors[] = "Row {$rowNumber}: Statement is required.";
        }

        if ($questionType->have_description && $descriptionEn === null && $descriptionUr === null) {
            $errors[] = "Row {$rowNumber}: Description is required.";
        }

        $options = [];

        if (in_array($schema['key'], [
            QuestionTypeSchemaRegistry::OBJECTIVE_MCQ,
            QuestionTypeSchemaRegistry::OBJECTIVE_BLANK_CHOICE,
            QuestionTypeSchemaRegistry::OBJECTIVE_TRUE_FALSE,
        ], true)) {
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
        }

        if ($errors !== []) {
            return ['errors' => $errors];
        }

        $content = $this->buildImportContent(
            questionType: $questionType,
            schemaKey: $schema['key'],
            statementEn: $statementEn,
            statementUr: $statementUr,
            descriptionEn: $descriptionEn,
            descriptionUr: $descriptionUr,
            answerEn: $answerEn,
            answerUr: $answerUr,
            options: $options,
        );

        if ($content === null) {
            return [
                'errors' => ["Row {$rowNumber}: Bulk import does not support {$schema['label']}."],
            ];
        }

        $validator = validator(['content' => $content], []);
        QuestionTypeSchemaRegistry::validateQuestionContent($questionType, $content, $validator);

        foreach ($validator->errors()->all() as $message) {
            $errors[] = "Row {$rowNumber}: {$message}";
        }

        if ($errors !== []) {
            return ['errors' => $errors];
        }

        $questionPayload = QuestionTypeSchemaRegistry::buildQuestionPayload($questionType, $content);

        return [
            'errors' => [],
            'record' => [
                'payload' => [
                    'question_type_id' => $questionType->id,
                    'schema_key' => $schema['key'],
                    'medium_id' => $mediumId ?? $this->defaultMediumId(),
                    'chapter_id' => $chapter->id,
                    'topic_id' => $chapter->effectiveSubjectType() === 'topic-wise'
                        ? $topic?->id
                        : null,
                    'statement_en' => $questionPayload['statement_en'],
                    'statement_ur' => $questionPayload['statement_ur'],
                    'description_en' => $questionPayload['description_en'],
                    'description_ur' => $questionPayload['description_ur'],
                    'answer_en' => $questionPayload['answer_en'],
                    'answer_ur' => $questionPayload['answer_ur'],
                    'content' => $questionPayload['content'],
                    'source' => $source,
                    'status' => $status,
                ],
                'options' => $questionPayload['options'],
            ],
        ];
    }

    private function defaultMediumId(): ?int
    {
        if (! $this->mediumResolved) {
            $this->bothMediumId = Medium::query()->where('name', 'Both')->value('id');
            $this->mediumResolved = true;
        }

        return $this->bothMediumId;
    }

    private function buildImportContent(

        QuestionType $questionType,
        string $schemaKey,
        ?string $statementEn,
        ?string $statementUr,
        ?string $descriptionEn,
        ?string $descriptionUr,
        ?string $answerEn,
        ?string $answerUr,
        array $options,
    ): ?array {
        return match ($schemaKey) {
            QuestionTypeSchemaRegistry::OBJECTIVE_MCQ,
            QuestionTypeSchemaRegistry::OBJECTIVE_BLANK_CHOICE => [
                'prompt_en' => $statementEn ?? '',
                'prompt_ur' => $statementUr ?? '',
                'options' => collect($options)
                    ->map(fn (array $option) => [
                        'text_en' => $option['text_en'] ?? '',
                        'text_ur' => $option['text_ur'] ?? '',
                        'is_correct' => (bool) ($option['is_correct'] ?? false),
                    ])
                    ->values()
                    ->all(),
            ],
            QuestionTypeSchemaRegistry::OBJECTIVE_TRUE_FALSE => [
                'prompt_en' => $statementEn ?? '',
                'prompt_ur' => $statementUr ?? '',
                'correct_boolean' => $this->resolveTrueFalseValue($answerEn, $answerUr, $options) ?? '',
            ],
            QuestionTypeSchemaRegistry::OBJECTIVE_BLANK_OPEN => [
                'prompt_en' => $statementEn ?? '',
                'prompt_ur' => $statementUr ?? '',
                'answer_en' => $answerEn ?? '',
                'answer_ur' => $answerUr ?? '',
            ],
            QuestionTypeSchemaRegistry::SUBJECTIVE_STANDARD => [
                'prompt_en' => $statementEn ?? '',
                'prompt_ur' => $statementUr ?? '',
                'guidance_en' => $descriptionEn ?? '',
                'guidance_ur' => $descriptionUr ?? '',
                'answer_en' => $questionType->have_answer ? ($answerEn ?? '') : '',
                'answer_ur' => $questionType->have_answer ? ($answerUr ?? '') : '',
            ],
            QuestionTypeSchemaRegistry::SUBJECTIVE_SAME_STATEMENT => [
                'prompt_en' => $statementEn ?? '',
                'prompt_ur' => $statementUr ?? '',
                'shared_en' => $descriptionEn ?? '',
                'shared_ur' => $descriptionUr ?? '',
                'answer_en' => $questionType->have_answer ? ($answerEn ?? '') : '',
                'answer_ur' => $questionType->have_answer ? ($answerUr ?? '') : '',
            ],
            default => null,
        };
    }

    private function resolveTrueFalseValue(?string $answerEn, ?string $answerUr, array $options): ?string
    {
        foreach ([$answerEn, $answerUr] as $answer) {
            $normalized = $this->normalizeBooleanWord($answer);

            if ($normalized !== null) {
                return $normalized;
            }
        }

        $correctOption = collect($options)->firstWhere('is_correct', true);

        if (! is_array($correctOption)) {
            return null;
        }

        return $this->normalizeBooleanWord(
            $correctOption['text_en'] ?? $correctOption['text_ur'] ?? null,
        );
    }

    private function normalizeBooleanWord(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return match (strtolower(trim($value))) {
            'true', 't' => 'true',
            'false', 'f' => 'false',
            default => null,
        };
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

    private function buildPreviewRow(array $row, array $optionIndexes, array $issues): array
    {
        $data = $row['data'];
        $record = $issues['record'] ?? null;

        return [
            'row_number' => $row['number'],
            'valid' => $issues['errors'] === [],
            'issues' => $issues['errors'],
            'statement_en' => $record['payload']['statement_en'] ?? $data['statement_en'] ?? null,
            'statement_ur' => $record['payload']['statement_ur'] ?? $data['statement_ur'] ?? null,
            'description_en' => $record['payload']['description_en'] ?? $data['description_en'] ?? null,
            'description_ur' => $record['payload']['description_ur'] ?? $data['description_ur'] ?? null,
            'answer_en' => $record['payload']['answer_en'] ?? $data['answer_en'] ?? null,
            'answer_ur' => $record['payload']['answer_ur'] ?? $data['answer_ur'] ?? null,
            'source' => $record['payload']['source'] ?? null,
            'status' => $record['payload']['status'] ?? null,
            'options' => $record['options'] ?? collect($optionIndexes)
                ->map(fn (int $index) => [
                    'text_en' => $data["option_{$index}_en"] ?? null,
                    'text_ur' => $data["option_{$index}_ur"] ?? null,
                    'is_correct' => $this->normalizeOptionCorrect($data["option_{$index}_correct"] ?? null) === true,
                    'sort_order' => $index,
                ])
                ->filter(fn (array $option) => $option['text_en'] !== null || $option['text_ur'] !== null)
                ->values()
                ->all(),
        ];
    }

    private function contentSignature(?array $content): string
    {
        return hash('sha256', json_encode($content ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function existingSignatures(QuestionType $questionType, Chapter $chapter, ?Topic $topic, array $rows, bool $records = false): array
    {
        if ($rows === []) {
            return [];
        }

        $english = collect($rows)->map(fn (array $row) => $records
            ? ($row['payload']['statement_en'] ?? null)
            : ($row['data']['statement_en'] ?? null))->filter()->unique()->values()->all();
        $urdu = collect($rows)->map(fn (array $row) => $records
            ? ($row['payload']['statement_ur'] ?? null)
            : ($row['data']['statement_ur'] ?? null))->filter()->unique()->values()->all();

        $query = Question::query()
            ->where('question_type_id', $questionType->id)
            ->where('chapter_id', $chapter->id)
            ->when($topic === null, fn ($query) => $query->whereNull('topic_id'), fn ($query) => $query->where('topic_id', $topic->id));

        if ($english === [] && $urdu === []) {
            $query->whereNull('statement_en')->whereNull('statement_ur');
        } else {
            $query->where(function ($query) use ($english, $urdu): void {
                if ($english !== []) {
                    $query->whereIn('statement_en', $english);
                }

                if ($urdu !== []) {
                    $english === [] ? $query->whereIn('statement_ur', $urdu) : $query->orWhereIn('statement_ur', $urdu);
                }
            });
        }

        return $query
            ->pluck('content')
            ->mapWithKeys(fn ($content) => [$this->contentSignature(is_array($content) ? $content : json_decode((string) $content, true)) => true])
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
        int $duplicateRows = 0,
    ): array {
        return [
            'status' => $status,
            'total_rows' => $totalRows,
            'ready_rows' => $readyRows,
            'failed_rows' => $failedRows,
            'duplicate_rows' => $duplicateRows,
            'errors' => $errors,
            'rows' => $rows,
            'records' => $records,
            'valid_row_numbers' => array_column($records, 'row_number'),
        ];
    }

    private function importReport(
        string $status,
        int $totalRows,
        int $importedRows,
        int $failedRows,
        array $errors,
        int $unselectedRows = 0,
        int $duplicateRows = 0,
    ): array {
        return [
            'status' => $status,
            'total_rows' => $totalRows,
            'imported_rows' => $importedRows,
            'failed_rows' => $failedRows,
            'unselected_rows' => $unselectedRows,
            'duplicate_rows' => $duplicateRows,
            'errors' => $errors,
        ];
    }
}
