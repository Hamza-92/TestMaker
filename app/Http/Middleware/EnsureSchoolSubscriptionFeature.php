<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class EnsureSchoolSubscriptionFeature
{
    public function handle(Request $request, Closure $next, string ...$features): Response
    {
        $user = $request->user();

        if (! $user || (! $user->isSchoolOwner() && ! $user->isTeacher())) {
            abort(403);
        }

        $subscription = $user->activeSchoolSubscription();

        foreach ($features as $feature) {
            if ($subscription && (bool) data_get($subscription, $feature)) {
                return $next($request);
            }
        }

        return Inertia::render('customer/blocked', [
            'title'   => 'Upgrade required',
            'heading' => 'This feature is not in your plan',
            'message' => 'Your current school subscription does not include online MCQ tests. Contact support or upgrade the plan to unlock it.',
            'primary' => [
                'href'  => '/dashboard',
                'label' => 'Back to Dashboard',
            ],
        ])->toResponse($request)->setStatusCode(403);
    }
}
