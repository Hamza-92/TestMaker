<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $actor = $request->user();
        $query = Expense::query()
            ->when(! $actor->isMasterSuperAdmin(), fn ($query) => $query->where('created_by', $actor->id));
        $total = (clone $query)->sum('amount');
        $page = $query->with('creator:id,name')->latest('created_at')->latest('id')->paginate(20);

        return Inertia::render('superadmin/expenses', [
            'expenses' => [
                'total' => number_format((float) $total, 2, '.', ''),
                'data' => $page->getCollection()->map(fn (Expense $expense) => [
                    'id' => $expense->id,
                    'name' => $expense->name,
                    'amount' => (string) $expense->amount,
                    'description' => $expense->description,
                    'created_by' => $expense->creator?->name ?? '—',
                    'created_at' => $expense->created_at?->toIso8601String(),
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
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'gt:0', 'decimal:0,2', 'max:9999999999.99'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        Expense::create([
            'name' => trim($validated['name']),
            'amount' => $validated['amount'],
            'description' => isset($validated['description']) ? trim($validated['description']) ?: null : null,
            'created_by' => $request->user()->id,
        ]);

        return redirect()->route('superadmin.payments.expenses');
    }
}
