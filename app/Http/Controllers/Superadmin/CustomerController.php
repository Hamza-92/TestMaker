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
        return Inertia::render('superadmin/customers');
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
