<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class QuestionImageController extends Controller
{
    public function storeForPaper(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'image', 'mimes:jpeg,png,webp,gif', 'max:4096'],
        ]);
        $id = (string) Str::uuid();
        $image = $validated['file'];

        DB::table('question_images')->insert([
            'id' => $id,
            'mime_type' => $image->getMimeType(),
            'data' => base64_encode($image->get()),
            'created_at' => now(),
        ]);

        return response()->json(['location' => route('question-images.show', $id, false)]);
    }

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
