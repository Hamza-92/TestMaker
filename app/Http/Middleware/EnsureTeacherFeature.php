<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class EnsureTeacherFeature
{
    public function handle(Request $request, Closure $next, string ...$features): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(403);
        }

        if ($user->isSchoolOwner()) {
            return $next($request);
        }

        if (! $user->isTeacher()) {
            abort(403);
        }

        if ($features === []) {
            return $next($request);
        }

        foreach ($features as $feature) {
            if ($user->hasTeacherPermission($feature)) {
                return $next($request);
            }
        }

        return Inertia::render('customer/blocked', [
            'title'   => 'Access denied',
            'heading' => 'Not enough access',
            'message' => "You don't have permission to use this part of the app. Contact your school administrator if you think this is a mistake.",
            'primary' => [
                'href'  => '/dashboard',
                'label' => 'Back to Dashboard',
            ],
        ])->toResponse($request)->setStatusCode(403);
    }
}
