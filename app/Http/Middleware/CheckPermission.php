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

        if (!$user || !$user->isSuperAdmin()) {
            abort(403);
        }

        foreach ($permissions as $permission) {
            abort_unless(Gate::allows($permission), 403);
        }

        return $next($request);
    }
}
