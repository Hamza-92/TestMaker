<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Subject;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ArabicSubjectController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('superadmin/arabic-subjects', [
            'subjects' => Subject::query()
                ->orderBy('name_eng')
                ->get(['id', 'name_eng', 'name_ur', 'status', 'is_arabic']),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'subject_ids' => ['present', 'array'],
            'subject_ids.*' => ['integer', 'distinct', Rule::exists('subjects', 'id')],
        ]);
        $selectedIds = collect($validated['subject_ids'])->map(fn ($id) => (int) $id)->flip();

        DB::transaction(function () use ($selectedIds): void {
            Subject::query()->get(['id', 'is_arabic'])->each(function (Subject $subject) use ($selectedIds): void {
                $isArabic = $selectedIds->has($subject->id);

                if ($subject->is_arabic === $isArabic) {
                    return;
                }

                $previous = $subject->is_arabic;
                $subject->update(['is_arabic' => $isArabic]);
                AuditLog::record(
                    model: $subject,
                    event: AuditEvent::Updated,
                    oldValues: ['is_arabic' => $previous],
                    newValues: ['is_arabic' => $isArabic],
                    notes: 'Arabic subject classification updated.',
                );
            });
        });

        return redirect()->route('superadmin.arabic-subjects')
            ->with('success', 'Arabic subject settings saved.');
    }
}
