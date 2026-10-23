<?php

namespace App\Services\Export;

use App\Models\Chapter;
use App\Models\ClassSubject;
use App\Models\Pattern;
use App\Models\Question;
use App\Models\QuestionType;
use App\Models\QuestionTypeHeading;
use App\Models\QuestionTypeOrder;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\HttpException;

class TestbaseExportService
{
    private const CONTRACT = 'testmaker-export/1';

    public function envelope(): array
    {
        return [
            'contract' => self::CONTRACT,
            'installationId' => config('testbase_export.installation_id'),
        ];
    }

    public function catalog(?int $patternId, ?int $classId): array
    {
        if ($classId !== null && $patternId === null) {
            throw new HttpException(422, 'classId requires patternId.');
        }

        $patterns = Pattern::query()->ordered()->limit(2001)->get();
        $classes = collect();
        $subjects = collect();
        if ($patternId !== null) {
            abort_unless($patterns->contains('id', $patternId), 404, 'Pattern not found.');
            $classes = SchoolClass::query()->ordered()
                ->whereHas('patterns', fn ($query) => $query->where('patterns.id', $patternId))
                ->limit(2001)->get();
        }
        if ($classId !== null) {
            abort_unless($classes->contains('id', $classId), 422, 'Class is outside the selected pattern.');
            $subjects = ClassSubject::query()->with(['subject', 'medium'])
                ->where('pattern_id', $patternId)->where('class_id', $classId)
                ->orderBy('id')->limit(2001)->get();
        }
        if ($patterns->count() > 2000 || $classes->count() > 2000 || $subjects->count() > 2000) {
            throw new HttpException(422, 'Catalog exceeds the export limit.');
        }

        return $this->envelope() + [
            'patterns' => $patterns->map(fn ($row) => [
                'id' => (string) $row->id, 'name' => $row->name,
                'nameUrdu' => null, 'status' => $this->status($row->status),
            ])->values()->all(),
            'classes' => $classes->map(fn ($row) => [
                'id' => (string) $row->id, 'name' => $row->name,
                'nameUrdu' => null, 'status' => $this->status($row->status),
            ])->values()->all(),
            'subjects' => $subjects->map(fn ($row) => [
                'id' => (string) $row->subject_id,
                'name' => $row->subject?->name_eng ?? '',
                'nameUrdu' => $this->optional($row->subject?->name_ur),
                'status' => $this->status($row->subject?->status),
                'medium' => $this->medium($row->medium?->name),
                'subjectType' => $this->subjectType($row->effectiveSubjectType()),
            ])->values()->all(),
        ];
    }

    public function snapshot(array $scope, ?string $expectedRevision = null): array
    {
        // A repeatable-read transaction keeps the relational inventory coherent.
        // Asset bytes are checked again before a page or asset response is sent.
        return DB::transaction(function () use ($scope, $expectedRevision): array {
            $pattern = Pattern::query()->findOrFail($scope['patternId']);
            $class = SchoolClass::query()->findOrFail($scope['classId']);
            $assignment = ClassSubject::query()->with(['subject', 'medium'])
                ->where('pattern_id', $pattern->id)
                ->where('class_id', $class->id)
                ->where('subject_id', $scope['subjectId'])->firstOrFail();
            abort_unless(DB::table('pattern_classes')->where('pattern_id', $pattern->id)
                ->where('class_id', $class->id)->exists(), 404, 'Assignment not found.');
            $subject = $assignment->subject;
            abort_unless($subject instanceof Subject, 404, 'Subject not found.');
            $medium = $this->medium($assignment->medium?->name);

            $chapters = Chapter::query()->with(['topics' => fn ($query) => $query->orderBy('sort_id')->orderBy('id')])
                ->where('pattern_id', $pattern->id)->where('class_id', $class->id)
                ->where('subject_id', $subject->id)->orderBy('sort_id')->orderBy('id')
                ->limit(2001)->get();
            if ($chapters->count() > 2000 || $chapters->contains(fn ($chapter) => $chapter->topics->count() > 2000)) {
                throw new HttpException(422, 'Structure exceeds the export limit.');
            }
            $chapterIds = $chapters->pluck('id');
            $questions = $chapterIds->isEmpty() ? collect() : Question::query()
                ->with(['options' => fn ($query) => $query->orderBy('id'), 'questionType'])
                ->whereIn('chapter_id', $chapterIds)->orderBy('id')->limit(20001)->get();
            if ($questions->count() > 20000) {
                throw new HttpException(422, 'Question count exceeds the export limit.');
            }
            $converter = new TestbasePayloadConverter;
            $questionRows = [];
            $rawQuestionHashes = [];
            $variants = [];
            $typeOrders = QuestionTypeOrder::query()
                ->where('pattern_id', $pattern->id)->where('class_id', $class->id)
                ->where('subject_id', $subject->id)->get()->keyBy('question_type_id');
            $applicableTypeIds = $questions->pluck('question_type_id')
                ->merge($typeOrders->keys())
                ->merge(QuestionTypeHeading::query()
                    ->where('pattern_id', $pattern->id)
                    ->where(function ($query) use ($class, $subject) {
                        $query->whereNull('class_id')->orWhere(function ($nested) use ($class, $subject) {
                            $nested->where('class_id', $class->id)
                                ->where(fn ($leaf) => $leaf->whereNull('subject_id')->orWhere('subject_id', $subject->id));
                        });
                    })->pluck('question_type_id'))
                ->unique()->values();
            $types = QuestionType::query()->whereIn('id', $applicableTypeIds)
                ->limit(501)->get()->sortBy(fn ($type) => sprintf(
                    '%010d-%010d', (int) ($typeOrders->get($type->id)?->sort_order ?? 1000000000), (int) $type->id,
                ))->values();
            if ($types->count() > 500) {
                throw new HttpException(422, 'Question type count exceeds the export limit.');
            }
            $rules = QuestionTypeHeading::query()
                ->where('pattern_id', $pattern->id)
                ->whereIn('question_type_id', $types->pluck('id'))
                ->where(function ($query) use ($class, $subject) {
                    $query->whereNull('class_id')->orWhere(function ($nested) use ($class, $subject) {
                        $nested->where('class_id', $class->id)
                            ->where(fn ($leaf) => $leaf->whereNull('subject_id')->orWhere('subject_id', $subject->id));
                    });
                })->get()->groupBy('question_type_id');
            $typeById = $types->keyBy('id');
            foreach ($types as $type) {
                $typeRules = $rules->get($type->id, collect());
                $sourceSchema = $this->sourceSchema($this->resolvedType($type, $typeRules));
                $this->ensureVariant($variants, $type, $sourceSchema, $typeRules, $converter);
            }
            foreach ($questions as $question) {
                $type = $typeById->get($question->question_type_id);
                if (! $type) {
                    throw new HttpException(503, 'Question type inventory is inconsistent.');
                }
                $typeRules = $rules->get($type->id, collect());
                $resolvedType = $this->resolvedType($type, $typeRules);
                $sourceSchema = $question->schema_key ?: $this->sourceSchema($resolvedType);
                $variantId = $this->ensureVariant($variants, $type, $sourceSchema, $typeRules, $converter);
                $converted = $converter->convert($question, $resolvedType, $medium);
                $chapterId = (string) $question->chapter_id;
                $topicId = $question->topic_id === null ? null : (string) $question->topic_id;
                $issues = $converted['issues'];
                if ($topicId !== null && ! $chapters->firstWhere('id', $question->chapter_id)?->topics->contains('id', $question->topic_id)) {
                    $issues[] = 'Question topic is outside its chapter.';
                }
                if ($topicId === null && $assignment->effectiveSubjectType() === 'topic-wise') {
                    $issues[] = 'Topic-wise question is missing its topic.';
                }
                $difficulty = $question->difficulty === null ? null : strtoupper($question->difficulty);
                if ($difficulty !== null && ! in_array($difficulty, ['EASY', 'MEDIUM', 'HARD'], true)) {
                    $issues[] = 'Question difficulty is unsupported.';
                    $difficulty = null;
                }
                $row = [
                    'id' => (string) $question->id,
                    'chapterId' => $chapterId,
                    'topicId' => $topicId,
                    'variantId' => $variantId,
                    'schema' => $converted['schema'],
                    'status' => $this->status($question->status),
                    'source' => $this->optional($question->source),
                    'difficulty' => $difficulty,
                    'order' => max(0, (int) $question->sort_order),
                    'itemCount' => $converted['itemCount'],
                    'payload' => $converted['payload'],
                    'issues' => $issues,
                ];
                $questionRows[] = $row;
                $rawQuestionHashes[] = $this->checksum([
                    'question' => $question->getAttributes(),
                    'options' => $question->options->map(fn ($option) => $option->getAttributes())->all(),
                ]);
                $variants[$variantId]['questionCount']++;
                $variants[$variantId]['itemCount'] += $row['itemCount'];
            }
            if (count($variants) > 500) {
                throw new HttpException(422, 'Question type variant count exceeds the export limit.');
            }

            $assets = [];
            $assetBytes = [];
            foreach ($converter->assets() as $id => $source) {
                if (count($assets) >= 5000) {
                    throw new HttpException(422, 'Referenced image count exceeds the export limit.');
                }
                [$entry, $bytes] = $this->readAsset($id, $source);
                $assets[$id] = $entry;
                if ($bytes !== null) {
                    $assetBytes[$id] = $bytes;
                }
            }
            ksort($assets, SORT_STRING);
            if (array_sum(array_column($assets, 'size')) > 200 * 1024 * 1024) {
                throw new HttpException(422, 'Referenced image bytes exceed the export limit.');
            }
            foreach ($questionRows as &$row) {
                if ($row['payload'] !== null && preg_match_all('/testmaker-asset:(asset-[a-f0-9]{64})/', json_encode($row['payload']), $matches)) {
                    foreach (array_unique($matches[1]) as $id) {
                        if (! ($assets[$id]['available'] ?? false)) {
                            $row['issues'][] = 'A referenced image is unavailable or unsupported.';
                        }
                    }
                }
                $row['hash'] = $this->checksum($row);
            }
            unset($row);

            $ambiguousGroupHeadings = 0;
            $chapterRows = $chapters->map(function ($chapter) use ($questionRows, &$ambiguousGroupHeadings) {
                $chapterQuestions = array_values(array_filter($questionRows, fn ($q) => $q['chapterId'] === (string) $chapter->id));
                $topics = $chapter->topics->map(fn ($topic) => [
                    'id' => (string) $topic->id,
                    'nameEnglish' => $this->optional($topic->name),
                    'nameUrdu' => $this->optional($topic->name_ur),
                    'status' => $this->status($topic->status),
                    'order' => max(0, (int) $topic->sort_id),
                    'questionCount' => count(array_filter($chapterQuestions, fn ($q) => $q['topicId'] === (string) $topic->id)),
                ])->all();
                $heading = $this->optional($chapter->group_heading);
                $hasUrdu = $heading !== null && preg_match('/[\x{0600}-\x{06FF}]/u', $heading);
                $hasEnglish = $heading !== null && preg_match('/[A-Za-z]/', $heading);
                if ($hasUrdu && $hasEnglish) {
                    $ambiguousGroupHeadings++;
                }

                return [
                    'id' => (string) $chapter->id,
                    'number' => max(0, (int) $chapter->chapter_number),
                    'order' => max(0, (int) $chapter->sort_id),
                    'nameEnglish' => $this->optional($chapter->name),
                    'nameUrdu' => $this->optional($chapter->name_ur),
                    'status' => $this->status($chapter->status),
                    'groupName' => $this->optional($chapter->group_name),
                    'groupHeadingEnglish' => $hasUrdu && ! $hasEnglish ? null : $heading,
                    'groupHeadingUrdu' => $hasUrdu && ! $hasEnglish ? $heading : null,
                    'questionCount' => count($chapterQuestions),
                    'topics' => $topics,
                ];
            })->all();
            $variantRows = array_values($variants);
            $typePositions = $types->pluck('id')->flip();
            usort($variantRows, fn ($a, $b) => (($typePositions[$a['sourceTypeId']] ?? 1000000000) <=> ($typePositions[$b['sourceTypeId']] ?? 1000000000))
                ?: strcmp($a['id'], $b['id']));
            $manifest = $this->envelope() + [
                'scope' => [
                    'patternId' => (string) $pattern->id,
                    'classId' => (string) $class->id,
                    'subjectId' => (string) $subject->id,
                ],
                'patternName' => $pattern->name,
                'className' => $class->name,
                'subjectName' => $subject->name_eng,
                'subjectNameUrdu' => $this->optional($subject->name_ur),
                'medium' => $medium,
                'subjectType' => $this->subjectType($assignment->effectiveSubjectType()),
                'chapters' => $chapterRows,
                'variants' => $variantRows,
                'assets' => array_values($assets),
                'questionCount' => count($questionRows),
                'itemCount' => array_sum(array_column($questionRows, 'itemCount')),
                'issues' => $ambiguousGroupHeadings > 0
                    ? ['Some chapter group headings mix languages and require source review.'] : [],
            ];
            $revision = $this->checksum([
                $manifest,
                $assignment->getAttributes(),
                $types->map(fn ($type) => $type->getAttributes())->all(),
                $rules->flatten(1)->sortBy('id')->values()
                    ->map(fn ($rule) => $rule->getAttributes())->all(),
                $rawQuestionHashes,
                array_column($questionRows, 'hash'),
            ]);
            if ($expectedRevision !== null && ! hash_equals($revision, $expectedRevision)) {
                throw new HttpException(409, 'The source scope changed. Start a new review.');
            }
            $manifest['revision'] = $revision;
            $manifest['capturedAt'] = now('UTC')->toIso8601String();

            return ['manifest' => $manifest, 'questions' => $questionRows, 'assetBytes' => $assetBytes];
        });
    }

    private function ensureVariant(array &$variants, QuestionType $type, string $sourceSchema, $rules, TestbasePayloadConverter $converter): string
    {
        $effective = $this->resolvedType($type, $rules);
        $effective->schema_key = $sourceSchema;
        $portable = $converter->convert(new Question(['schema_key' => $sourceSchema]), $effective, 'ENGLISH');
        $schema = $portable['schema'];
        $variantId = 'type-'.$type->id.'-'.substr(hash('sha256', $sourceSchema.'|'.($schema ?? 'null')), 0, 16);
        if (! isset($variants[$variantId])) {
            [$headingEn, $originEn] = $this->heading($type, $rules, 'en');
            [$headingUr, $originUr] = $this->heading($type, $rules, 'ur');
            $variants[$variantId] = [
                'id' => $variantId,
                'sourceTypeId' => (string) $type->id,
                'nameEnglish' => $type->name,
                'nameUrdu' => $this->optional($type->name_ur),
                'category' => $type->is_objective ? 'OBJECTIVE' : 'SUBJECTIVE',
                'sourceSchema' => $sourceSchema,
                'schema' => $schema,
                'defaultHeadingEnglish' => $type->heading_en ?? '',
                'defaultHeadingUrdu' => $type->heading_ur ?? '',
                'headingEnglish' => $headingEn,
                'headingUrdu' => $headingUr,
                'headingOriginEnglish' => $originEn,
                'headingOriginUrdu' => $originUr,
                'questionCount' => 0,
                'itemCount' => 0,
                'issues' => $schema === null ? ['Source schema has no compatible TestBase conversion.'] : [],
            ];
        }

        return $variantId;
    }

    private function resolvedType(QuestionType $type, $rules): QuestionType
    {
        $resolved = clone $type;
        foreach ($rules->sortBy(fn ($rule) => ($rule->class_id === null ? 0 : ($rule->subject_id === null ? 1 : 2))) as $rule) {
            if (filled($rule->schema_key)) {
                $resolved->schema_key = $rule->schema_key;
            }
        }

        return $resolved;
    }

    private function heading(QuestionType $type, $rules, string $language): array
    {
        $value = $type->{'heading_'.$language} ?? '';
        $origin = 'GLOBAL';
        foreach ($rules->sortBy(fn ($rule) => ($rule->class_id === null ? 0 : ($rule->subject_id === null ? 1 : 2))) as $rule) {
            $candidate = $rule->{'heading_'.$language};
            if (filled($candidate)) {
                $value = $candidate;
                $origin = $rule->subject_id !== null ? 'SUBJECT' : ($rule->class_id !== null ? 'CLASS' : 'PATTERN');
            }
        }

        return [$value, $origin];
    }

    private function sourceSchema(QuestionType $type): string
    {
        return $type->schema_key ?: QuestionTypeSchemaRegistry::infer(
            (bool) $type->is_objective,
            [
                'objective_type_id' => $type->objective_type_id,
                'have_description' => $type->have_description,
                'have_answer' => $type->have_answer,
            ],
        );
    }

    private function readAsset(string $id, string $source): array
    {
        $empty = ['id' => $id, 'mime' => 'application/octet-stream', 'size' => 0,
            'sha256' => hash('sha256', ''), 'available' => false];
        $path = parse_url($source, PHP_URL_PATH);
        if (! is_string($path)) {
            return [$empty, null];
        }
        $host = parse_url($source, PHP_URL_HOST);
        $approved = array_filter(array_map('trim', explode(',', (string) config('testbase_export.image_hosts', ''))));
        $appHost = parse_url((string) config('app.url'), PHP_URL_HOST);
        if ($appHost) {
            $approved[] = $appHost;
        }
        if ($host !== null && ! in_array(strtolower($host), array_map('strtolower', $approved), true)) {
            return [$empty, null];
        }
        $bytes = null;
        if (preg_match('#^/question-images/([a-f0-9-]{36})$#i', $path, $matches)) {
            $encoded = DB::table('question_images')->where('id', $matches[1])->value('data');
            $bytes = is_string($encoded) ? base64_decode($encoded, true) : null;
        } elseif (preg_match('#^/storage/([A-Za-z0-9_./-]+)$#', $path, $matches) &&
            ! str_contains($matches[1], '..')) {
            $root = realpath(Storage::disk('public')->path(''));
            $file = realpath(Storage::disk('public')->path($matches[1]));
            if ($root !== false && $file !== false &&
                str_starts_with($file, $root.DIRECTORY_SEPARATOR) && is_file($file)) {
                $bytes = file_get_contents($file, false, null, 0, 2 * 1024 * 1024 + 1);
            }
        }
        if (! is_string($bytes) || strlen($bytes) > 2 * 1024 * 1024) {
            return [$empty, null];
        }
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($bytes);
        if (! in_array($mime, ['image/png', 'image/jpeg', 'image/webp'], true)) {
            return [$empty, null];
        }

        return [[
            'id' => $id, 'mime' => $mime, 'size' => strlen($bytes),
            'sha256' => hash('sha256', $bytes), 'available' => true,
        ], $bytes];
    }

    private function checksum(mixed $value): string
    {
        return hash('sha256', $this->canonical($value));
    }

    private function canonical(mixed $value): string
    {
        if (is_array($value)) {
            if (array_is_list($value)) {
                return '['.implode(',', array_map($this->canonical(...), $value)).']';
            }
            ksort($value, SORT_STRING);
            $pairs = [];
            foreach ($value as $key => $item) {
                $pairs[] = json_encode((string) $key, JSON_THROW_ON_ERROR).':'.$this->canonical($item);
            }

            return '{'.implode(',', $pairs).'}';
        }
        if (is_object($value)) {
            $properties = get_object_vars($value);
            ksort($properties, SORT_STRING);
            $pairs = [];
            foreach ($properties as $key => $item) {
                $pairs[] = json_encode((string) $key, JSON_THROW_ON_ERROR).':'.$this->canonical($item);
            }

            return '{'.implode(',', $pairs).'}';
        }

        return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE |
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS);
    }

    private function optional(?string $value): ?string
    {
        return $value === null || trim($value) === '' ? null : $value;
    }

    private function status(mixed $value): string
    {
        return (int) $value === 1 ? 'ACTIVE' : 'INACTIVE';
    }

    private function medium(?string $value): string
    {
        return match (strtolower((string) $value)) {
            'english' => 'ENGLISH', 'urdu' => 'URDU', 'both' => 'BOTH',
            default => throw new HttpException(422, 'Assignment medium is not configured.'),
        };
    }

    private function subjectType(string $value): string
    {
        return $value === 'topic-wise' ? 'TOPIC_WISE' : 'CHAPTER_WISE';
    }
}
