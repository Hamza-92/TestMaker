<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CustomerController extends Controller
{
    public function index()
    {
        return Inertia::render('superadmin/customers', [
            'customers' => [
                [
                    'id' => 1,
                    'name' => 'John Doe',
                    'email' => 'john.doe@example.com',
                    'created_at' => '2024-01-01 12:00:00',
                ]
            ]
        ]);
    }
}
