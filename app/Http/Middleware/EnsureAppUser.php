<?php

namespace App\Http\Middleware;

use App\Enums\UserType;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAppUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || in_array($user->user_type, [UserType::SuperAdmin, UserType::Staff])) {
            return redirect('/dashboard');
        }

        return $next($request);
    }
}
