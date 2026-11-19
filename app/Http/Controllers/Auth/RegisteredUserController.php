<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Laravel\Fortify\Contracts\RegisterViewResponse;

class RegisteredUserController extends Controller
{
    public function create(): RegisterViewResponse
    {
        return app(RegisterViewResponse::class);
    }

    public function store(Request $request, CreatesNewUsers $creator): RedirectResponse|JsonResponse
    {
        event(new Registered($creator->create($request->all())));
        $request->session()->regenerate();
        $message = 'Your school account has been created. Log in with your phone number or email and password.';

        if ($request->expectsJson()) {
            return response()->json(['message' => $message, 'redirect_url' => route('login')], 201);
        }

        return to_route('login')->with('status', $message);
    }
}
