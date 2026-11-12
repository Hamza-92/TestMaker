<?php

namespace App\Support\LegacyTransfer;

use App\Enums\UserType;
use App\Models\LegacyUserImport;
use App\Models\User;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SiteLoginHandoff
{
    private function legacy(): ConnectionInterface
    {
        return DB::connection('legacy_mysql');
    }

    public function issueFor(User $user): ?string
    {
        if (! $user->isActive() || (! $user->isCustomer() && ! $user->isTeacher())) {
            return null;
        }

        $target = $user->isCustomer() ? $this->oldCustomer($user) : $this->oldTeacher($user);
        if ($target === null) {
            return null;
        }

        $token = bin2hex(random_bytes(32));
        $this->legacy()->table('site_login_handoffs')->insert([
            'token_hash' => hash('sha256', $token),
            'source_site' => 'new',
            'source_role' => $user->isCustomer() ? 'customer' : 'teacher',
            'source_user_id' => $user->id,
            'target_role' => $target['role'],
            'target_user_id' => $target['id'],
            'expires_at' => now('UTC')->addMinute()->toDateTimeString(),
            'created_at' => now('UTC')->toDateTimeString(),
        ]);
        if (random_int(1, 100) === 1) {
            $this->legacy()->table('site_login_handoffs')
                ->where('expires_at', '<', now('UTC')->subDay()->toDateTimeString())->delete();
        }

        return $token;
    }

    public function consumeOldToken(string $token): ?User
    {
        if (! preg_match('/\A[a-f0-9]{64}\z/', $token)) {
            return null;
        }

        $hash = hash('sha256', $token);
        $claimed = $this->legacy()->table('site_login_handoffs')
            ->where('token_hash', $hash)
            ->where('source_site', 'old')
            ->whereNull('consumed_at')
            ->whereRaw('expires_at > UTC_TIMESTAMP()')
            ->update(['consumed_at' => DB::raw('UTC_TIMESTAMP()')]);
        if ($claimed !== 1) {
            return null;
        }

        $handoff = $this->legacy()->table('site_login_handoffs')->where('token_hash', $hash)->first();
        if ($handoff?->source_role === 'customer') {
            $source = $this->legacy()->table('admin')->where('id', $handoff->source_user_id)
                ->whereIn('account_type', ['Paid', 'Trial'])->first();

            return $source && $this->oldCustomerAllowed($source) ? $this->newCustomer($source) : null;
        }
        if ($handoff?->source_role === 'teacher') {
            $source = $this->legacy()->table('teachers')->where('id', $handoff->source_user_id)->first();
            $owner = $source ? $this->legacy()->table('admin')->where('id', $source->user_id)->first() : null;

            return $source && $owner && $this->oldCustomerAllowed($owner)
                && (string) $source->status === '1'
                && (string) $source->expdate >= now('Asia/Karachi')->toDateString()
                    ? $this->newTeacher($source) : null;
        }

        return null;
    }

    /** @return array{role: string, id: int}|null */
    private function oldCustomer(User $user): ?array
    {
        $linkedId = LegacyUserImport::query()->where('target_user_id', $user->id)->value('source_user_id');
        $row = $linkedId ? $this->legacy()->table('admin')->where('id', $linkedId)->first() : null;

        return $row && in_array($row->account_type, ['Paid', 'Trial'], true)
            ? ['role' => 'customer', 'id' => (int) $row->id]
            : null;
    }

    /** @return array{role: string, id: int}|null */
    private function oldTeacher(User $user): ?array
    {
        $ownerId = LegacyUserImport::query()->where('target_user_id', $user->school_id)->value('source_user_id');
        if (! $ownerId) {
            return null;
        }

        $row = $this->uniqueOldContact('teachers', $user->email, $user->phone, null, (int) $ownerId);

        return $row ? ['role' => 'teacher', 'id' => (int) $row->id] : null;
    }

    private function newCustomer(object $source): ?User
    {
        $linkedId = LegacyUserImport::query()->where('source_user_id', $source->id)->value('target_user_id');
        if ($linkedId) {
            $user = User::find($linkedId);

            return $user?->isCustomer() ? $user : null;
        }

        // Email and phone are useful for finding a possible link, but neither old account
        // verifies ownership of those fields. They cannot authorize a login by themselves.
        return null;
    }

    private function newTeacher(object $source): ?User
    {
        $ownerId = LegacyUserImport::query()->where('source_user_id', $source->user_id)->value('target_user_id');
        if (! $ownerId) {
            return null;
        }

        return $this->uniqueNewContact(UserType::Teacher, $source->username ?? '', $source->cell_number ?? '', (int) $ownerId);
    }

    private function uniqueOldContact(string $table, ?string $email, ?string $phone, ?array $accountTypes = null, ?int $ownerId = null): ?object
    {
        $emailColumn = $table === 'teachers' ? 'username' : 'email';
        $phoneColumn = $table === 'teachers' ? 'cell_number' : 'phone';
        $base = $this->legacy()->table($table);
        if ($accountTypes !== null) {
            $base->whereIn('account_type', $accountTypes);
        }
        if ($ownerId !== null) {
            $base->where('user_id', $ownerId);
        }

        $emailMatches = $this->emailMatches(clone $base, $emailColumn, $email);
        $phoneMatches = $this->phoneMatches(clone $base, $phoneColumn, $phone);

        return $this->singleConsistentMatch($emailMatches, $phoneMatches);
    }

    private function uniqueNewContact(UserType $role, ?string $email, ?string $phone, ?int $ownerId = null): ?User
    {
        $base = User::query()->where('user_type', $role->value);
        if ($ownerId !== null) {
            $base->where('school_id', $ownerId);
        }

        $emailMatches = $this->emailMatches(clone $base, 'email', $email);
        $phoneMatches = $this->phoneMatches(clone $base, 'phone', $phone);
        $match = $this->singleConsistentMatch($emailMatches, $phoneMatches);

        return $match instanceof User ? $match : null;
    }

    private function emailMatches($query, string $column, ?string $email): array
    {
        $email = Str::lower(trim((string) $email));

        return filter_var($email, FILTER_VALIDATE_EMAIL)
            ? $query->whereRaw("LOWER($column) = ?", [$email])->limit(2)->get()->all()
            : [];
    }

    private function phoneMatches($query, string $column, ?string $phone): array
    {
        $digits = preg_replace('/\D+/', '', (string) $phone);
        if ($digits === null || strlen($digits) < 10 || strlen($digits) > 14) {
            return [];
        }
        $local = match (true) {
            str_starts_with($digits, '00923') => '0'.substr($digits, 4),
            str_starts_with($digits, '923') => '0'.substr($digits, 2),
            strlen($digits) === 10 && str_starts_with($digits, '3') => '0'.$digits,
            default => $digits,
        };
        if (! preg_match('/\A03\d{9}\z/', $local)) {
            return [];
        }
        $variants = [$local, '92'.substr($local, 1), '0092'.substr($local, 1), substr($local, 1)];
        $normalized = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE($column, ' ', ''), '-', ''), '+', ''), '(', ''), ')', ''), '.', '')";

        return $query->whereRaw($normalized.' IN ('.implode(',', array_fill(0, count($variants), '?')).')', $variants)
            ->limit(2)->get()->all();
    }

    private function singleConsistentMatch(array $emailMatches, array $phoneMatches): ?object
    {
        if (count($emailMatches) > 1 || count($phoneMatches) > 1) {
            return null;
        }
        if ($emailMatches && $phoneMatches && (int) $emailMatches[0]->id !== (int) $phoneMatches[0]->id) {
            return null;
        }

        return $emailMatches[0] ?? $phoneMatches[0] ?? null;
    }

    private function oldCustomerAllowed(object $customer): bool
    {
        if ($customer->status !== 'Enabled' || ! in_array($customer->account_type, ['Paid', 'Trial'], true)
            || (string) $customer->end_date < now('Asia/Karachi')->toDateString()) {
            return false;
        }
        $due = (string) ($customer->due_payment_date ?? '0000-00-00');
        if ($due !== '' && $due !== '0000-00-00') {
            return $due >= now('Asia/Karachi')->toDateString();
        }

        return (int) ($customer->allowed_questions ?? 0) <= 0 || (int) ($customer->remaining_questions ?? 0) > 0;
    }
}
