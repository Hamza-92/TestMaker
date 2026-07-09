<?php

namespace App\Http\Controllers;

use App\Enums\TeacherPermission;
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

        $paperOwnerIds = $this->paperOwnerIds($user);
        $papers = Paper::query()->whereIn('user_id', $paperOwnerIds);

        return Inertia::render('customer/dashboard', [
            'stats' => [
                'papers'    => (clone $papers)->where('is_draft', false)->count(),
                'drafts'    => (clone $papers)->where('is_draft', true)->count(),
                'questions' => Question::query()->where('status', 1)->count(),
                'subjects'  => Subject::query()->where('status', 1)->count(),
                'classes'   => SchoolClass::query()->where('status', 1)->count(),
            ],
            'recentPapers' => Paper::query()
                ->whereIn('user_id', $paperOwnerIds)
                ->latest('updated_at')
                ->limit(5)
                ->get(['id', 'name', 'subject', 'class_name', 'total_marks', 'is_draft', 'updated_at']),
        ]);
    }

    private function paperOwnerIds($user): array
    {
        if ($user->isTeacher() && $user->hasTeacherPermission(TeacherPermission::ViewSchoolPapers->value)) {
            $schoolOwner = $user->schoolOwner();
            $ids = [$user->id];

            if ($schoolOwner !== null) {
                $ids = array_values(array_unique([
                    ...$ids,
                    $schoolOwner->id,
                    ...$schoolOwner->teachers()->pluck('id')->all(),
                ]));
            }

            return $ids;
        }

        return [$user->id];
    }
}
