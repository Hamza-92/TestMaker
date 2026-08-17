<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AnnouncementController extends Controller
{
    public function index()
    {
        return Inertia::render('superadmin/announcements', [
            'announcements' => Announcement::query()
                ->latest('id')
                ->get()
                ->map(fn (Announcement $announcement) => $this->present($announcement))
                ->values(),
        ]);
    }

    public function create()
    {
        return Inertia::render('superadmin/announcements/form', ['announcement' => null]);
    }

    public function store(Request $request)
    {
        Announcement::create($this->normalize($this->validated($request)));

        return to_route('superadmin.announcements')->with('success', 'Announcement created successfully.');
    }

    public function edit(Announcement $announcement)
    {
        return Inertia::render('superadmin/announcements/form', [
            'announcement' => $this->present($announcement),
        ]);
    }

    public function update(Request $request, Announcement $announcement)
    {
        $announcement->update($this->normalize($this->validated($request), $announcement));

        return to_route('superadmin.announcements')->with('success', 'Announcement updated successfully.');
    }

    public function destroy(Announcement $announcement)
    {
        $announcement->delete();

        return back()->with('success', 'Announcement deleted.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'summary' => ['nullable', 'string', 'max:500'],
            'body' => ['nullable', 'string', 'max:5000'],
            'type' => ['required', Rule::in(['feature', 'update', 'maintenance', 'important', 'event'])],
            'placement' => ['required', Rule::in(['banner', 'card', 'both'])],
            'status' => ['required', Rule::in(['draft', 'published', 'archived'])],
            'action_label' => ['nullable', 'string', 'max:50'],
            'action_url' => ['nullable', 'string', 'max:500', 'regex:/^(\/|https?:\/\/)/i'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_dismissible' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:9999'],
        ]);
    }

    private function normalize(array $data, ?Announcement $announcement = null): array
    {
        foreach (['summary', 'body', 'action_label', 'action_url'] as $field) {
            $data[$field] = filled($data[$field] ?? null) ? trim($data[$field]) : null;
        }

        $data['published_at'] = $data['status'] === 'published'
            ? ($announcement?->published_at ?? Carbon::now())
            : null;

        return $data;
    }

    private function present(Announcement $announcement): array
    {
        return [
            'id' => $announcement->id,
            'title' => $announcement->title,
            'summary' => $announcement->summary,
            'body' => $announcement->body,
            'type' => $announcement->type,
            'placement' => $announcement->placement,
            'status' => $announcement->status,
            'action_label' => $announcement->action_label,
            'action_url' => $announcement->action_url,
            'starts_at' => $announcement->starts_at?->toISOString(),
            'ends_at' => $announcement->ends_at?->toISOString(),
            'published_at' => $announcement->published_at?->toISOString(),
            'is_dismissible' => $announcement->is_dismissible,
            'sort_order' => $announcement->sort_order,
        ];
    }
}
