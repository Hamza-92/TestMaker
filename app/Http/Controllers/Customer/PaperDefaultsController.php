<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\PaperDefault;
use App\Support\CustomerPaperDefaults;
use App\Support\SubjectiveAnswerAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaperDefaultsController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('customer/paper-defaults', [
            'paperDefaults' => CustomerPaperDefaults::forUser($request->user()),
            'canViewSubjectiveAnswers' => SubjectiveAnswerAccess::allows($request->user()),
            'canEditWatermark' => CustomerPaperDefaults::canEditWatermark($request),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate(CustomerPaperDefaults::rules($request->user()));
        $existing = PaperDefault::where('user_id', $request->user()->id)->first();
        if (! CustomerPaperDefaults::canEditWatermark($request)) {
            $data['settings'] = CustomerPaperDefaults::preserveWatermarkSettings(
                $data['settings'],
                $existing?->settings ?? [],
            );
        }
        PaperDefault::updateOrCreate(['user_id' => $request->user()->id], [
            'settings' => $data['settings'],
            'header' => array_map(fn ($value) => $value ?? '', $data['header']),
            'view_mode' => $data['viewMode'],
            'num_sets' => $data['numSets'],
        ]);

        return back()->with('toast', ['type' => 'success', 'message' => 'Paper defaults saved. New papers will use these settings.']);
    }

    public function destroy(Request $request): RedirectResponse
    {
        $defaults = PaperDefault::where('user_id', $request->user()->id)->first();
        if ($defaults && ! CustomerPaperDefaults::canEditWatermark($request)) {
            $watermark = CustomerPaperDefaults::watermarkSettings($defaults->settings ?? []);
            if ($watermark !== []) {
                $defaults->update([
                    'settings' => $watermark,
                    'header' => [],
                    'view_mode' => 'paper',
                    'num_sets' => 1,
                ]);
            } else {
                $defaults->delete();
            }
        } else {
            $defaults?->delete();
        }

        return back()->with('toast', ['type' => 'success', 'message' => 'System paper defaults restored.']);
    }
}
