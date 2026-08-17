<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AnnouncementDismissal;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AnnouncementController extends Controller
{
    public function index()
    {
        return Inertia::render('customer/announcements', [
            'announcements' => Announcement::query()
                ->published()
                ->get()
                ->map(fn (Announcement $announcement) => $this->present($announcement))
                ->values(),
        ]);
    }

    public function show(Announcement $announcement)
    {
        $announcement = Announcement::query()
            ->published()
            ->whereKey($announcement->id)
            ->firstOrFail();

        return Inertia::render('customer/announcement-show', [
            'announcement' => $this->present($announcement),
        ]);
    }
    public function dismiss(Request $request, Announcement $announcement)
    {
        abort_unless($announcement->is_dismissible, 404);

        $data = $request->validate([
            'surface' => ['required', Rule::in(['banner', 'card'])],
        ]);

        AnnouncementDismissal::query()->firstOrCreate([
            'announcement_id' => $announcement->id,
            'user_id' => $request->user()->id,
            'surface' => $data['surface'],
        ]);

        return back();
    }

    private function present(Announcement $announcement): array
    {
        return [
            'id' => $announcement->id,
            'title' => $announcement->title,
            'summary' => $announcement->summary,
            'body' => $announcement->body,
            'type' => $announcement->type,
            'banner_style' => $announcement->banner_style,
            'banner_direction' => $announcement->banner_direction,
            'banner_font' => $announcement->banner_font,
            'banner_background' => $announcement->banner_background,
            'banner_text_color' => $announcement->banner_text_color,
            'action_label' => $announcement->action_label,
            'action_url' => $announcement->action_url,
            'details_url' => '/announcements/'.$announcement->id,
            'published_at' => $announcement->published_at?->toISOString(),
            'is_dismissible' => $announcement->is_dismissible,
        ];
    }}

