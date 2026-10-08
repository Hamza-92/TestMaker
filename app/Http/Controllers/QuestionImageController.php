<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class QuestionImageController extends Controller
{
    public function show(string $image): Response
    {
        $asset = DB::table('question_images')->where('id', $image)->first(['mime_type', 'data']);
        abort_unless($asset, 404);

        return response(base64_decode($asset->data, true), 200, [
            'Content-Type' => $asset->mime_type,
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
