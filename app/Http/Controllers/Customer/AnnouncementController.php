<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AnnouncementDismissal;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function dismiss(Request $request, Announcement $announcement)
    {
        abort_unless($announcement->is_dismissible, 404);

        AnnouncementDismissal::query()->firstOrCreate([
            'announcement_id' => $announcement->id,
            'user_id' => $request->user()->id,
        ]);

        return back();
    }
}
