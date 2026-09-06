<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\Pattern;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\TrialSetting;
use App\Support\SubscriptionAccess;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TrialSettingController extends Controller
{
    public function index()
    {
        $resources = $this->accessResources();

        return Inertia::render('superadmin/trial-settings', [
            'settings'        => TrialSetting::current(),
            'patterns'        => $resources['patterns'],
            'classes'         => $resources['classes'],
            'subjects'        => $resources['subjects'],
            'patternClassMap' => $resources['patternClassMap'],
            'classSubjectMap' => $resources['classSubjectMap'],
        ]);
    }

    public function update(Request $request)
    {
        $resources = $this->accessResources();

        $data = $request->validate([
            'trial_duration_days' => ['required', 'integer', 'min:1', 'max:365'],
            'access_scope'        => ['nullable', 'array'],
        ]);

        $accessScope = SubscriptionAccess::normalizeScope($data['access_scope'] ?? null, $resources);

        TrialSetting::current()->update([
            'trial_duration_days' => $data['trial_duration_days'],
            'access_scope'        => $accessScope,
        ]);

        return back()->with('success', 'Trial settings saved.');
    }

    private function accessResources(): array
    {
        return [
            'patterns' => Pattern::where('status', 1)->ordered()->get(['id', 'name', 'short_name']),
            'classes'  => SchoolClass::where('status', 1)->ordered()->get(['id', 'name']),
            'subjects' => Subject::where('status', 1)->orderBy('name_eng')->get(['id', 'name_eng', 'name_ur']),
            ...SubscriptionAccess::buildMaps(),
        ];
    }
}
