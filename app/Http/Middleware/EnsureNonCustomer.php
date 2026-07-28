<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureNonCustomer
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->isCustomer()) {
            return redirect('/dashboard');
        }

        return $next($request);
    }
}
