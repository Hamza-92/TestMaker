<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
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
            'first_name' => ['required', 'string', 'max:100'],
            'last_name'  => ['required', 'string', 'max:100'],
            'email'      => ['required', 'email', 'max:255'],
            'phone'      => ['nullable', 'string', 'max:30'],
            'company'    => ['nullable', 'string', 'max:150'],
            'website'    => ['nullable', 'url', 'max:255'],
            'plan'       => ['required', 'in:basic,pro,enterprise'],
            'status'     => ['required', 'in:active,inactive,pending'],
            'country'    => ['nullable', 'string', 'max:100'],
            'city'       => ['nullable', 'string', 'max:100'],
            'address'    => ['nullable', 'string', 'max:255'],
            'notes'      => ['nullable', 'string', 'max:2000'],
        ]);

        // TODO: persist $validated once Customer model & migration are ready
        // Customer::create($validated);

        return redirect()->route('superadmin.customers')
            ->with('success', 'Customer created successfully.');
    }
}
