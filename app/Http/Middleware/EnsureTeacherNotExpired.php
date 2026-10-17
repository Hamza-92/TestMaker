<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureTeacherNotExpired
{
    public function handle(Request $request, Closure $next): Response
    {
        $teacher = $request->user();

        if (! $teacher?->teacherAccessExpired() || $request->routeIs('customer.teachers.impersonation.stop')) {
            return $next($request);
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Your teacher access has expired.'], 401);
        }

        return redirect()->route('login')->withErrors([
            'email' => 'Your teacher access has expired. Contact your school administrator.',
        ]);
    }
}
