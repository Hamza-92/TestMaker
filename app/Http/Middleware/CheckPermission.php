<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isSuperAdmin() || ! $user->isActive()) {
            abort(403);
        }

        foreach ($permissions as $permission) {
            $allowed = false;

            foreach (explode('|', $permission) as $ability) {
                if (Gate::allows($ability)) {
                    $allowed = true;
                    break;
                }
            }

            abort_unless($allowed, 403);
        }

        return $next($request);
    }
}
