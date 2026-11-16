<?php

namespace App\Http\Middleware;

use App\Support\Qat\QatTrial;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class EnforceQatTrial
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $school = $user ? QatTrial::school($user) : null;
        if ($school === null) {
            return $next($request);
        }

        Inertia::encryptHistory();

        $trial = QatTrial::summary($school);
        if ($request->routeIs('impersonation.stop', 'customer.teachers.impersonation.stop')) {
            $request->session()->forget('qat_preview');

            return $next($request);
        }

        if (! $trial['locked']) {
            if ($request->routeIs('customer.qat.*', 'dashboard')) {
                return $this->noStore($next($request));
            }

            return $this->redirect($request, 'customer.qat.index', 403);
        }

        $entry = $request->session()->get('qat_preview');
        $final = ! $trial['expired']
            && ($entry['trial_final'] ?? false)
            && ($entry['user_id'] ?? null) === (int) $user->id
            && ($entry['id'] ?? null) === $request->route('preview');

        if ($final && $request->routeIs('customer.qat.previews.show') && empty($entry['trial_opened'])) {
            $request->session()->put('qat_preview.trial_opened', true);
            Inertia::clearHistory();

            return $this->noStore($next($request));
        }

        if ($final && $request->routeIs('customer.qat.previews.save') && ! empty($entry['trial_opened'])) {
            return $this->noStore($next($request));
        }

        if ($request->routeIs('customer.qat.upgrade')) {
            $request->session()->forget('qat_preview');
            Inertia::clearHistory();

            return $this->noStore($next($request));
        }

        $request->session()->forget('qat_preview');

        return $this->redirect($request, 'customer.qat.upgrade', 423);
    }

    private function redirect(Request $request, string $route, int $status): Response
    {
        if ($request->expectsJson() || ! $request->isMethodSafe()) {
            return response()->json([
                'message' => $status === 423 ? 'Upgrade your QAT subscription to continue.' : 'Your trial only includes QAT practice papers.',
                'redirect_url' => route($route),
            ], $status);
        }

        return redirect()->route($route);
    }

    private function noStore(Response $response): Response
    {
        $response->headers->set('Cache-Control', 'private, no-store');

        return $response;
    }
}
