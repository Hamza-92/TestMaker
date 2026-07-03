<?php

namespace App\Http\Controllers;

use App\Enums\UserType;
use App\Models\Paper;
use App\Models\Question;
use App\Models\SchoolClass;
use App\Models\Subject;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        if (in_array($user->user_type, [UserType::SuperAdmin, UserType::Staff])) {
            return Inertia::render('dashboard');
        }

        $papers = Paper::query()->where('user_id', $user->id);

        return Inertia::render('customer/dashboard', [
            'stats' => [
                'papers' => (clone $papers)->where('is_draft', false)->count(),
                'drafts' => (clone $papers)->where('is_draft', true)->count(),
                'questions' => Question::query()->where('status', 1)->count(),
                'subjects' => Subject::query()->where('status', 1)->count(),
                'classes' => SchoolClass::query()->where('status', 1)->count(),
            ],
            'recentPapers' => Paper::query()
                ->where('user_id', $user->id)
                ->latest('updated_at')
                ->limit(5)
                ->get(['id', 'name', 'subject', 'class_name', 'total_marks', 'is_draft', 'updated_at']),
        ]);
    }
}
