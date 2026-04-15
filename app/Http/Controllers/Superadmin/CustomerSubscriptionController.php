<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CustomerSubscriptionController extends Controller
{
    public function create(User $customer)
    {
        return Inertia::render('superadmin/customers/subscriptions/add', [
            'customer' => $customer->only(['id', 'name', 'email', 'school_name']),
        ]);
    }

    public function store(Request $request, User $customer)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'allowed_questions' => ['required', 'integer', 'min:0'],
            'started_at' => ['required', 'date'],
            'duration' => ['required', 'integer', 'min:1'],
            'status' => ['required', 'in:active,expired,cancelled'],
        ]);

        $startedAt = Carbon::parse($validated['started_at'])->startOfDay();

        Subscription::create([
            'user_id' => $customer->id,
            'name' => $validated['name'],
            'pattern_access' => null,
            'class_access' => null,
            'subject_access' => null,
            'allowed_questions' => $validated['allowed_questions'],
            'amount' => $validated['amount'],
            'started_at' => $startedAt,
            'duration' => $validated['duration'],
            'expired_at' => $startedAt->copy()->addDays((int) $validated['duration']),
            'status' => $validated['status'],
            'created_by' => auth()->id(),
        ]);

        return redirect()
            ->route('superadmin.customers.show', $customer)
            ->with('success', 'Subscription added successfully.');
    }
}
