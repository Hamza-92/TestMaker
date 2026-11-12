<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\CustomerPaymentAccess;
use App\Support\LegacyTransfer\SiteLoginHandoff;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SiteSwitchController extends Controller
{
    public function toOld(Request $request, SiteLoginHandoff $handoff, CustomerPaymentAccess $paymentAccess): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $oldUrl = rtrim((string) config('app.legacy_website_url'), '/');

        $state = (string) $request->query('state');
        if ($state === '') {
            return redirect()->away($oldUrl.'/site-switch-prepare.php');
        }
        if (! preg_match('/\A[a-f0-9]{32}\z/', $state)) {
            return redirect()->away($oldUrl.'/login.php?site_switch=unavailable');
        }

        if ($request->session()->has('impersonator_id') || $request->session()->has('teacher_impersonator_id')
            || ! $user->isActive() || $user->teacherAccessExpired() || $paymentAccess->isBlockedFor($user)) {
            return redirect()->away($oldUrl.'/login.php?site_switch=unavailable');
        }

        $token = $handoff->issueFor($user);

        return redirect()->away($oldUrl.($token
            ? '/site-switch-complete.php?code='.$token.'&state='.$state
            : '/login.php?site_switch=account_not_found'));
    }

    public function prepareFromOld(Request $request): RedirectResponse
    {
        $state = bin2hex(random_bytes(16));
        $request->session()->put('site_switch_from_old_state', $state);

        return redirect()->away(rtrim((string) config('app.legacy_website_url'), '/').'/site-switch-start.php?state='.$state);
    }

    public function fromOld(Request $request, SiteLoginHandoff $handoff, CustomerPaymentAccess $paymentAccess): RedirectResponse
    {
        $expectedState = (string) $request->session()->pull('site_switch_from_old_state', '');
        $state = (string) $request->query('state');
        if (! preg_match('/\A[a-f0-9]{32}\z/', $state) || ! hash_equals($expectedState, $state)) {
            return to_route('login')->withErrors(['email' => 'The sign-in link was not started in this browser. Please try again.']);
        }

        $user = $handoff->consumeOldToken((string) $request->query('code'));
        if (! $user) {
            return to_route('login')->withErrors(['email' => 'We could not find a matching account here. Please sign in.']);
        }
        if (! $user->isActive() || $user->teacherAccessExpired() || $user->two_factor_secret !== null
            || $paymentAccess->isBlockedFor($user)) {
            return to_route('login')->withErrors(['email' => 'This account cannot sign in right now.']);
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        Auth::login($user);
        $request->session()->regenerate();

        return to_route('dashboard');
    }
}
