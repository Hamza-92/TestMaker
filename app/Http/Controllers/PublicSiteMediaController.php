<?php

namespace App\Http\Controllers;

use App\Models\SiteMedia;
use Illuminate\Http\Response;

class PublicSiteMediaController extends Controller
{
    public function show(SiteMedia $media): Response
    {
        abort_unless(in_array($media->mime_type, ['image/jpeg', 'image/png', 'image/webp'], true), 404);

        return response(base64_decode($media->data_base64, true), 200, [
            'Content-Type' => $media->mime_type,
            'Content-Length' => $media->byte_size,
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
