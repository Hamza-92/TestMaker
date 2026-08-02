<?php

namespace App\Http\Controllers;

use App\Enums\UserType;
use App\Support\CustomerDashboardData;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        if (in_array($user->user_type, [UserType::SuperAdmin, UserType::Staff])) {
            return Inertia::render('dashboard');
        }

        return Inertia::render(
            'customer/dashboard-view',
            CustomerDashboardData::for($user),
        );
    }
}
