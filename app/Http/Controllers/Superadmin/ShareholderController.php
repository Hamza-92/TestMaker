<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ShareholderSpend;
use App\Models\User;
use App\Support\ShareholderBalance;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ShareholderController extends Controller
{
    public function index(): Response
    {
        $totals = ShareholderBalance::totals();
        $page = ShareholderSpend::query()
            ->with('creator:id,name')
            ->latest('created_at')
            ->latest('id')
            ->paginate(20);

        return Inertia::render('superadmin/shareholder', [
            'summary' => [
                'profit' => ShareholderBalance::money($totals['profit']),
                'reserve' => ShareholderBalance::money($totals['reserve']),
                'spent' => ShareholderBalance::money($totals['spent']),
                'available' => ShareholderBalance::money($totals['available']),
            ],
            'ledger' => [
                'data' => $page->getCollection()->map(fn (ShareholderSpend $spend) => [
                    'id' => $spend->id,
                    'amount' => (string) $spend->amount,
                    'note' => $spend->note,
                    'by' => $spend->creator?->name ?? '—',
                    'created_at' => $spend->created_at?->toIso8601String(),
                ])->all(),
                'meta' => [
                    'current_page' => $page->currentPage(),
                    'last_page' => $page->lastPage(),
                    'per_page' => $page->perPage(),
                    'total' => $page->total(),
                    'from' => $page->firstItem(),
                    'to' => $page->lastItem(),
                ],
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateSpend($request);

        DB::transaction(function () use ($request, $validated): void {
            $this->lockLedger($request->user());
            $available = ShareholderBalance::totals()['available'];
            if ($this->paisa($validated['amount']) > $available) {
                throw ValidationException::withMessages(['amount' => 'Amount exceeds the available balance.']);
            }

            $spend = ShareholderSpend::create([
                'amount' => $validated['amount'],
                'note' => trim($validated['note']),
                'created_by' => $request->user()->id,
            ]);
            AuditLog::record($spend, AuditEvent::Created, newValues: [
                'amount' => (string) $spend->amount,
                'note' => $spend->note,
            ], actor: $request->user());
        });

        return redirect()->route('superadmin.payments.shareholder');
    }

    public function update(Request $request, ShareholderSpend $spend): RedirectResponse
    {
        $validated = $this->validateSpend($request);

        DB::transaction(function () use ($request, $validated, $spend): void {
            $this->lockLedger($request->user());
            $spend = ShareholderSpend::query()->lockForUpdate()->findOrFail($spend->id);
            $increase = $this->paisa($validated['amount']) - $this->paisa((string) $spend->amount);
            if ($increase > 0 && $increase > ShareholderBalance::totals()['available']) {
                throw ValidationException::withMessages(['amount' => 'Amount exceeds the available balance.']);
            }

            $oldValues = ['amount' => (string) $spend->amount, 'note' => $spend->note];
            $spend->update(['amount' => $validated['amount'], 'note' => trim($validated['note'])]);
            AuditLog::record($spend, AuditEvent::Updated, oldValues: $oldValues, newValues: [
                'amount' => (string) $spend->amount,
                'note' => $spend->note,
            ], actor: $request->user());
        });

        return redirect()->route('superadmin.payments.shareholder');
    }

    public function destroy(Request $request, ShareholderSpend $spend): RedirectResponse
    {
        DB::transaction(function () use ($request, $spend): void {
            $this->lockLedger($request->user());
            $spend = ShareholderSpend::query()->lockForUpdate()->findOrFail($spend->id);
            AuditLog::record($spend, AuditEvent::Deleted, oldValues: [
                'amount' => (string) $spend->amount,
                'note' => $spend->note,
            ], actor: $request->user());
            $spend->delete();
        });

        return redirect()->route('superadmin.payments.shareholder');
    }

    private function validateSpend(Request $request): array
    {
        return $request->validate([
            'amount' => ['required', 'numeric', 'gt:0', 'decimal:0,2', 'max:9999999999.99'],
            'note' => ['required', 'string', 'max:500'],
        ]);
    }

    private function lockLedger(User $actor): void
    {
        User::query()->whereKey($actor->id)->lockForUpdate()->firstOrFail();
    }

    private function paisa(string $amount): int
    {
        return (int) round((float) $amount * 100);
    }
}
