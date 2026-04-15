<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\UserType;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class CustomerController extends Controller
{
    public function index()
    {
        $customers = User::where('user_type', UserType::Customer)
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'email', 'school_name', 'logo', 'city', 'province', 'status', 'created_at']);

        return Inertia::render('superadmin/customers', [
            'customers' => $customers,
        ]);
    }

    public function show(User $customer)
    {
        $customer->load([
            'subscriptions' => fn ($q) => $q->latest('started_at')
                ->select(['id', 'user_id', 'name', 'amount', 'allowed_questions', 'started_at', 'expired_at', 'duration', 'status']),
        ]);

        return Inertia::render('superadmin/customers/show', [
            'customer' => $customer->only([
                'id', 'name', 'email',
                'school_name', 'logo',
                'address', 'city', 'province', 'is_show_address',
                'status', 'created_at',
                'subscriptions',
            ]),
        ]);
    }

    public function create()
    {
        return Inertia::render('superadmin/customers/add');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                  => ['required', 'string', 'max:255'],
            'email'                 => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
            'status'                => ['required', 'in:active,inactive,suspended'],
            'school_name'           => ['nullable', 'string', 'max:255'],
            'logo'                  => ['nullable', 'image', 'mimes:png,jpg,jpeg', 'max:2048'],
            'address'               => ['nullable', 'string', 'max:255'],
            'city'                  => ['nullable', 'string', 'max:100'],
            'province'              => ['nullable', 'string', 'max:100'],
            'is_show_address'       => ['boolean'],
        ]);

        if ($request->hasFile('logo')) {
            $validated['logo'] = $request->file('logo')->store('logos', 'public');
        }

        $validated['password']   = Hash::make($validated['password']);
        $validated['user_type']  = UserType::Customer->value;
        $validated['created_by'] = auth()->id();

        User::create($validated);

        return redirect()->route('superadmin.customers')
            ->with('success', 'Customer created successfully.');
    }
}
