<?php

namespace App\Support\LegacyTransfer;

use App\Models\LegacyUserImport;
use App\Models\Pattern;
use App\Models\PaymentLog;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Subscription;
use App\Models\User;
use App\Support\SubscriptionAccess;
use Carbon\Carbon;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class LegacyUserTransferService
{
    private const SOURCE_CONNECTION = 'legacy_mysql';

    private const TESTMAKER_ACCOUNT_TYPES = ['Paid', 'Trial'];

    private const EXAMS_SOLUTION_ACCOUNT_TYPES = ['Exam-Paid', 'Exam-Trial'];

    private const IGNORED_PATTERN_KEYS = ['bubble_sheet', 'past_papers'];

    private const PATTERN_ALIASES = [
        'punjab' => 'PECTA', 'short_syllabus' => 'PECTA', 'pef' => 'PEF',
        'fedral' => 'F.B', 'afaq' => 'Iqbal Series', 'afaq_sons' => 'Sun Series',
        'ajk' => 'AJK', 'kpk' => 'KPK', 'ss' => 'S.S', 'sindh' => 'Sindh',
    ];

    /** @return array<string, mixed> */
    public function indexData(): array
    {
        $rows = $this->source()->table('admin')
            ->whereIn('account_type', self::TESTMAKER_ACCOUNT_TYPES)
            ->orderByDesc('id')
            ->get(['id', 'name', 'email', 'phone', 'school_name', 'status', 'account_type', 'package', 'start_date', 'end_date']);
        $imports = LegacyUserImport::query()->whereIn('source_user_id', $rows->pluck('id'))->get()->keyBy('source_user_id');
        $today = now()->startOfDay();

        $accounts = $rows->map(function (object $row) use ($imports, $today): array {
            $endDate = $this->date($row->end_date);
            $import = $imports->get((int) $row->id);
            $state = $row->status !== 'Enabled' ? 'disabled' : (($endDate && $endDate->gte($today)) ? 'active' : 'expired');

            return [
                'source_id' => (int) $row->id,
                'name' => trim((string) $row->name),
                'school_name' => trim((string) $row->school_name),
                'email' => trim((string) $row->email),
                'phone' => trim((string) $row->phone),
                'account_type' => $row->account_type === 'Paid' ? 'paid' : 'trial',
                'package' => trim((string) $row->package),
                'start_date' => $this->date($row->start_date)?->toDateString(),
                'end_date' => $endDate?->toDateString(),
                'state' => $state,
                'transferred' => $import !== null,
                'target_user_id' => $import?->target_user_id,
                'transferred_at' => $import?->transferred_at?->toIso8601String(),
            ];
        })->all();

        return [
            'scope' => [
                'excluded_examssolution' => $this->source()->table('admin')->whereIn('account_type', self::EXAMS_SOLUTION_ACCOUNT_TYPES)->count(),
            ],
            'accounts' => $accounts,
            ...$this->accessResources(),
        ];
    }

    /** @return array<string, mixed> */
    public function detail(int $sourceUserId): array
    {
        if (LegacyUserImport::query()->where('source_user_id', $sourceUserId)->exists()) {
            throw new RuntimeException('This legacy account has already been transferred.');
        }

        $row = $this->sourceRow($sourceUserId);
        [$scope, $warnings] = $this->mapAccess($row);
        $start = $this->date($row->start_date) ?? now()->startOfDay();
        $end = $this->date($row->end_date) ?? $start->copy()->addYear();
        if ($end->lte($start)) {
            $warnings[] = 'Subscription dates need correction.';
            $end = $start->copy()->addDay();
        }

        $legacyEmail = Str::lower(trim((string) $row->email));
        $email = $legacyEmail;
        if (! filter_var($legacyEmail, FILTER_VALIDATE_EMAIL)) {
            $email = $this->temporaryEmail($row);
            $warnings[] = 'A temporary email was generated from the phone number and can be changed later.';
        } elseif (User::withTrashed()->whereRaw('LOWER(email) = ?', [$legacyEmail])->exists()) {
            $warnings[] = 'Email already exists in Laravel and must be changed.';
        }

        $legacyAttachments = $this->legacyAttachments($row);

        return [
            'source_id' => (int) $row->id,
            'name' => trim((string) $row->name),
            'email' => $email,
            'phone' => trim((string) $row->phone),
            'school_name' => trim((string) $row->school_name),
            'address' => trim((string) $row->postal_address),
            'city' => trim((string) $row->city),
            'province' => trim((string) $row->province),
            'is_show_address' => (int) $row->show_adress === 1,
            'account_type' => $row->account_type === 'Paid' ? 'paid' : 'trial',
            'user_status' => $row->status === 'Enabled' ? 'active' : 'inactive',
            'subscription_name' => trim((string) $row->package) ?: 'Legacy '.($row->account_type === 'Paid' ? 'Subscription' : 'Trial'),
            'started_at' => $start->toDateString(),
            'expired_at' => $end->toDateString(),
            'subscription_status' => $row->status === 'Enabled' && $end->gte(now()->startOfDay()) ? 'active' : 'expired',
            'amount' => number_format((float) $row->price, 2, '.', ''),
            'is_question_based' => (int) $row->allowed_questions > 0,
            'allowed_questions' => max(0, (int) $row->allowed_questions),
            'remaining_questions' => max(0, (int) $row->remaining_questions),
            'allow_subjective_answers' => (int) $row->answers_access === 1,
            'access_scope' => $scope,
            'legacy_patterns' => $this->jsonArray($row->pattern_type),
            'legacy_logo' => trim((string) $row->school_logo) !== '',
            'payment_plan' => trim((string) $row->payment_plan),
            'next_payment_date' => $this->date($row->due_payment_date)?->toDateString(),
            'attachment_count' => count($legacyAttachments),
            'legacy_attachments' => $legacyAttachments,
            'warnings' => array_values(array_unique($warnings)),
        ];
    }

    /** @param array<string, mixed> $data */
    public function transfer(int $sourceUserId, array $data, int $actorId): LegacyUserImport
    {
        $row = $this->sourceRow($sourceUserId);
        $resources = $this->accessResources();
        $scope = SubscriptionAccess::normalizeScope($data['access_scope'] ?? [], $resources);
        if ($scope === []) {
            throw new RuntimeException('Select at least one accessible pattern and class.');
        }
        $summaryIds = SubscriptionAccess::summaryIds($scope, $resources);
        $startedAt = Carbon::parse($data['started_at'])->startOfDay();
        $expiredAt = Carbon::parse($data['expired_at'])->startOfDay();
        $duration = max(1, $startedAt->diffInDays($expiredAt));

        return DB::transaction(function () use ($row, $sourceUserId, $data, $actorId, $scope, $summaryIds, $startedAt, $expiredAt, $duration): LegacyUserImport {
            if (LegacyUserImport::query()->where('source_user_id', $sourceUserId)->lockForUpdate()->exists()) {
                throw new RuntimeException('This legacy account has already been transferred.');
            }

            $assets = $this->migrateAssets($row);

            $user = User::create([
                'name' => $data['name'], 'email' => Str::lower(trim($data['email'])), 'phone' => $data['phone'] ?: null,
                'password' => Hash::make((string) $row->password), 'address' => $data['address'] ?: null,
                'city' => $data['city'] ?: null, 'province' => $data['province'] ?: null,
                'is_show_address' => (bool) ($data['is_show_address'] ?? false),
                'school_name' => $data['school_name'] ?: null, 'logo' => $assets['logo'], 'user_type' => 'customer',
                'status' => $data['user_status'], 'account_type' => $data['account_type'], 'created_by' => $actorId,
            ]);

            $isQuestionBased = (bool) ($data['is_question_based'] ?? false);
            $subscription = Subscription::create([
                'user_id' => $user->id, 'name' => $data['subscription_name'],
                'pattern_access' => $summaryIds['pattern_access'], 'class_access' => $summaryIds['class_access'],
                'subject_access' => $summaryIds['subject_access'], 'access_scope' => $scope,
                'allow_teachers' => false, 'allow_online_mcq_tests' => false,
                'allow_subjective_answers' => (bool) ($data['allow_subjective_answers'] ?? false),
                'max_teachers' => null, 'is_question_based' => $isQuestionBased,
                'allowed_questions' => $isQuestionBased ? (int) $data['allowed_questions'] : null,
                'remaining_questions' => $isQuestionBased ? (int) $data['remaining_questions'] : null,
                'amount' => $data['amount'], 'started_at' => $startedAt, 'duration' => $duration,
                'expired_at' => $expiredAt, 'status' => $data['subscription_status'], 'created_by' => $actorId,
            ]);

            $paymentLog = $this->createLegacyPaymentRecord($subscription, $data, $assets, $actorId);

            return LegacyUserImport::create([
                'source_user_id' => $sourceUserId, 'target_user_id' => $user->id,
                'subscription_id' => $subscription->id, 'source_account_type' => (string) $row->account_type,
                'source_checksum' => hash('sha256', json_encode((array) $row, JSON_UNESCAPED_UNICODE)),
                'warnings' => $data['warnings'] ?? null,
                'source_snapshot' => ['id' => (int) $row->id, 'account_type' => (string) $row->account_type, 'package' => (string) $row->package, 'assets' => $assets, 'payment_log_id' => $paymentLog?->id],
                'transferred_by' => $actorId, 'transferred_at' => now(),
            ]);
        });
    }

    /** @param array<string, mixed> $data */
    private function createLegacyPaymentRecord(Subscription $subscription, array $data, array $assets, int $actorId): ?PaymentLog
    {
        $paymentPlan = trim((string) ($data['payment_plan'] ?? ''));
        $attachments = collect($assets['attachments'] ?? [])->pluck('path')->filter()->values()->all();
        if ($paymentPlan === '' && $attachments === []) {
            return null;
        }

        $notes = "Imported Legacy TestMaker Payment Record\n\n";
        $notes .= $paymentPlan !== '' ? $paymentPlan : 'No payment-plan text was recorded.';
        $notes .= "\n\nThe legacy system did not store a structured payment amount or method for this record.";

        return PaymentLog::create([
            'subscription_id' => $subscription->id,
            'amount' => 0,
            'payment_method' => 'cash',
            'account_number' => 'legacy-testmaker',
            'next_payment_date' => ($data['next_payment_date'] ?? null) ?: null,
            'status' => 'approved',
            'attachments' => $attachments ?: null,
            'reviewed_by' => $actorId,
            'reviewed_at' => now(),
            'notes' => $notes,
            'created_by' => $actorId,
        ]);
    }

    /** @return array<string, mixed> */
    private function accessResources(): array
    {
        return [
            'patterns' => Pattern::where('status', 1)->ordered()->get(['id', 'name', 'short_name']),
            'classes' => SchoolClass::where('status', 1)->ordered()->get(['id', 'name']),
            'subjects' => Subject::where('status', 1)->orderBy('name_eng')->get(['id', 'name_eng', 'name_ur']),
            ...SubscriptionAccess::buildMaps(),
        ];
    }

    /** @return array{0: array<string, mixed>, 1: array<int, string>} */
    private function mapAccess(object $row): array
    {
        $resources = $this->accessResources();
        $patterns = collect($resources['patterns']);
        $classes = collect($resources['classes']);
        $subjects = collect($resources['subjects']);
        $selectedClassIds = array_map('intval', $this->jsonArray($row->class_access));
        $selectedSubjectIds = array_map('intval', $this->jsonArray($row->subject_access));
        $sourceClasses = $this->source()->table('pk_class')->whereIn('id', $selectedClassIds)->get(['id', 'name'])->keyBy('id');
        $sourceSubjects = $this->source()->table('pk_subject')->whereIn('id', $selectedSubjectIds)->get(['id', 'name'])->keyBy('id');
        $warnings = [];
        $scope = [];

        foreach ($this->jsonArray($row->pattern_type) as $rawKey) {
            $key = trim((string) $rawKey);
            if (in_array($key, self::IGNORED_PATTERN_KEYS, true)) {
                continue;
            }
            $alias = self::PATTERN_ALIASES[$key] ?? null;
            if ($alias === null) {
                $warnings[] = "Pattern '{$key}' needs manual mapping.";

                continue;
            }
            $pattern = $patterns->first(fn ($item) => strcasecmp((string) $item->short_name, $alias) === 0);
            if (! $pattern) {
                $warnings[] = "Target pattern '{$alias}' is unavailable.";

                continue;
            }
            $availableClasses = array_map('intval', $resources['patternClassMap'][$pattern->id] ?? []);
            $targetClassIds = $selectedClassIds === [] ? $availableClasses : [];
            foreach ($selectedClassIds as $sourceClassId) {
                $sourceClass = $sourceClasses->get($sourceClassId);
                $targetClass = $sourceClass ? $classes->first(fn ($item) => $this->classKey($item->name) === $this->classKey($sourceClass->name)) : null;
                if ($targetClass && in_array((int) $targetClass->id, $availableClasses, true)) {
                    $targetClassIds[] = (int) $targetClass->id;
                }
            }
            foreach (array_unique($targetClassIds) as $classId) {
                $availableSubjects = array_map('intval', $resources['classSubjectMap']["{$pattern->id}:{$classId}"] ?? []);
                $mappedSubjects = [];
                if ($selectedSubjectIds !== []) {
                    foreach ($sourceSubjects as $sourceSubject) {
                        $target = $subjects->first(fn ($item) => $this->subjectKey($item->name_eng) === $this->subjectKey($sourceSubject->name)
                            || $this->subjectKey($item->name_ur) === $this->subjectKey($sourceSubject->name));
                        if ($target && in_array((int) $target->id, $availableSubjects, true)) {
                            $mappedSubjects[] = (int) $target->id;
                        }
                    }
                }
                $scope[(string) $pattern->id]['classes'][(string) $classId] = [
                    'subjects' => $selectedSubjectIds === [] ? null : array_values(array_unique($mappedSubjects)),
                ];
            }
        }

        if ($scope === []) {
            $warnings[] = 'No access could be mapped automatically. Select access before transfer.';
        }

        return [SubscriptionAccess::normalizeScope($scope, $resources) ?? $scope, $warnings];
    }

    private function temporaryEmail(object $row): string
    {
        $phone = Str::lower((string) preg_replace('/[^a-z0-9]+/i', '', trim((string) $row->phone)));
        $base = $phone !== '' ? Str::limit($phone, 180, '') : 'legacy'.$row->id;
        $candidate = $base.'@mail.com';

        if (! User::withTrashed()->whereRaw('LOWER(email) = ?', [$candidate])->exists()) {
            return $candidate;
        }

        $candidate = $base.'-legacy'.$row->id.'@mail.com';
        $suffix = 1;
        while (User::withTrashed()->whereRaw('LOWER(email) = ?', [$candidate])->exists()) {
            $candidate = $base.'-legacy'.$row->id.'-'.$suffix.'@mail.com';
            $suffix++;
        }

        return $candidate;
    }

    private function sourceRow(int $sourceUserId): object
    {
        $row = $this->source()->table('admin')->where('id', $sourceUserId)->whereIn('account_type', self::TESTMAKER_ACCOUNT_TYPES)->first();
        if (! $row) {
            throw new RuntimeException('Legacy TestMaker account was not found.');
        }

        return $row;
    }

    private function source(): ConnectionInterface
    {
        return DB::connection(self::SOURCE_CONNECTION);
    }

    private function date(mixed $value): ?Carbon
    {
        $value = trim((string) $value);
        if ($value === '' || str_starts_with($value, '0000-')) {
            return null;
        }
        try {
            return Carbon::createFromFormat('Y-m-d', substr($value, 0, 10))->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }

    private function jsonArray(mixed $value): array
    {
        $decoded = json_decode((string) $value, true);

        return is_array($decoded) ? array_values($decoded) : [];
    }

    /** @return array<int, array{file_name: string, original_name: string, uploaded_at: string}> */
    private function legacyAttachments(object $row): array
    {
        return collect($this->jsonArray($row->attachments))
            ->filter(fn (mixed $attachment) => is_array($attachment))
            ->map(function (array $attachment): array {
                $fileName = basename((string) ($attachment['file_name'] ?? ''));

                return [
                    'file_name' => $fileName,
                    'original_name' => trim((string) ($attachment['original_name'] ?? '')) ?: $fileName,
                    'uploaded_at' => (string) ($attachment['uploaded_at'] ?? ''),
                ];
            })
            ->filter(fn (array $attachment) => $attachment['file_name'] !== '')
            ->values()
            ->all();
    }

    /** @return array{logo: ?string, attachments: array<int, array<string, string>>} */
    private function migrateAssets(object $row): array
    {
        $logo = null;
        $fileName = basename(trim((string) $row->school_logo));
        if ($fileName !== '') {
            $extension = Str::lower(pathinfo($fileName, PATHINFO_EXTENSION));
            $contents = $this->readLegacyAsset('uploads/'.$fileName);
            if ($contents !== null && in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'], true)) {
                $logo = 'logos/legacy-'.$row->id.'-'.substr(hash('sha256', $contents), 0, 12).'.'.$extension;
                if (! Storage::disk('public')->exists($logo)) {
                    Storage::disk('public')->put($logo, $contents);
                }
            }
        }

        $attachments = [];
        $missingAttachments = [];
        foreach ($this->legacyAttachments($row) as $attachment) {
            $name = $attachment['file_name'];
            $contents = $this->readLegacyAsset('uploads/admin_attachments/'.$name);
            if ($contents === null) {
                $missingAttachments[] = $attachment['original_name'];

                continue;
            }

            $target = 'legacy-user-attachments/'.$row->id.'/'.substr(hash('sha256', $contents), 0, 12).'-'.$name;
            if (! Storage::disk('public')->exists($target) && ! Storage::disk('public')->put($target, $contents)) {
                $missingAttachments[] = $attachment['original_name'];

                continue;
            }

            $attachments[] = [
                'path' => $target,
                'original_name' => $attachment['original_name'],
                'uploaded_at' => $attachment['uploaded_at'],
            ];
        }

        if ($missingAttachments !== []) {
            throw new RuntimeException(
                'The account was not transferred because these legacy attachments could not be copied: '
                .implode(', ', $missingAttachments).'.'
            );
        }

        return ['logo' => $logo, 'attachments' => $attachments];
    }

    private function readLegacyAsset(string $relativePath): ?string
    {
        $relativePath = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, ltrim($relativePath, '/\\'));
        $localPath = rtrim((string) config('legacy-transfer.asset_root'), '\\/').DIRECTORY_SEPARATOR.$relativePath;
        if (is_file($localPath)) {
            $contents = file_get_contents($localPath);

            return $contents === false ? null : $contents;
        }

        $baseUrl = rtrim((string) config('legacy-transfer.asset_url'), '/');
        $urlPath = implode('/', array_map('rawurlencode', explode(DIRECTORY_SEPARATOR, $relativePath)));
        try {
            $response = Http::withoutVerifying()->connectTimeout(3)->timeout(15)->get($baseUrl.'/'.$urlPath);

            return $response->successful() ? $response->body() : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function classKey(mixed $value): string
    {
        return match (preg_replace('/[^a-z0-9]+/', '', Str::lower(trim((string) $value)))) {
            'one' => '1st', '1styear' => '1styear', '2ndyear' => '2ndyear', 'kgprep' => 'prepkg',
            default => preg_replace('/[^a-z0-9]+/', '', Str::lower(trim((string) $value))),
        };
    }

    private function subjectKey(mixed $value): string
    {
        return preg_replace('/[\s\p{P}\p{S}]+/u', '', Str::lower(trim((string) $value)));
    }
}
