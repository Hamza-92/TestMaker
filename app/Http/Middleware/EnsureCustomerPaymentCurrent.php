<?php

namespace App\Http\Middleware;

use App\Support\CustomerPaymentAccess;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureCustomerPaymentCurrent
{
    public function __construct(private CustomerPaymentAccess $access) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null
            || (! $user->isCustomer() && ! $user->isTeacher())
            || $request->session()->has('impersonator_id')
            || $request->session()->has('teacher_impersonator_id')) {
            return $next($request);
        }

        if (! $this->access->isBlockedFor($user)) {
            return $next($request);
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $message = 'Your school account is paused because a subscription payment is overdue. Contact TestMaker.';

        if ($request->expectsJson()) {
            return response()->json(['message' => $message], 401);
        }

        return redirect()->route('login')->withErrors(['email' => $message]);
    }
}
