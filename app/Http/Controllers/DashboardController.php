<?php

namespace App\Http\Controllers;

use App\Enums\UserType;
use App\Support\CustomerDashboardData;
use App\Support\SuperadminDashboardSummary;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        if (in_array($user->user_type, [UserType::SuperAdmin, UserType::Staff])) {
            return Inertia::render('dashboard', [
                'summary' => SuperadminDashboardSummary::for($user),
                'trends' => SuperadminDashboardSummary::trendsFor($user),
                'paymentsToReview' => SuperadminDashboardSummary::paymentsToReviewFor($user),
            ]);
        }

        return Inertia::render(
            'customer/dashboard-view',
            CustomerDashboardData::for($user),
        );
    }
}
