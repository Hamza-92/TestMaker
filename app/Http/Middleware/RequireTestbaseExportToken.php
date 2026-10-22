<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireTestbaseExportToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $headers = [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ];
        $digest = config('testbase_export.token_sha256');
        $installation = config('testbase_export.installation_id');
        $token = $request->bearerToken();

        if (! config('testbase_export.enabled') || ! is_string($installation) ||
            ! preg_match('/^[A-Za-z0-9_-]{1,100}$/', $installation) ||
            ! is_string($digest) || ! preg_match('/^[a-f0-9]{64}$/', $digest)) {
            return response()->json(['message' => 'Export is unavailable.'], 403, $headers);
        }

        if (! is_string($token) || $token === '' ||
            ! hash_equals($digest, hash('sha256', $token))) {
            return response()->json(['message' => 'Invalid export credential.'], 401, $headers);
        }

        $response = $next($request);
        foreach ($headers as $name => $value) {
            $response->headers->set($name, $value);
        }

        return $response;
    }
}
