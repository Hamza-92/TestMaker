<?php

namespace App\Http\Middleware;

use App\Support\Qat\QatAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectQatOnlyCustomers
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null || ! QatAccess::only($user)) {
            return $next($request);
        }

        if ($request->expectsJson() || ! $request->isMethodSafe()) {
            abort(403, 'Your school subscription only includes QAT tests.');
        }

        return redirect()->route('customer.qat.index');
    }
}
