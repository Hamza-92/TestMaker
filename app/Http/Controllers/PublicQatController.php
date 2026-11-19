<?php

namespace App\Http\Controllers;

use App\Models\TrialSetting;
use App\Support\Qat\QatTrial;
use App\Support\SiteNavigation;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

class PublicQatController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('qat', [
            'canRegister' => Features::enabled(Features::registration()),
            'trialLimit' => QatTrial::LIMIT,
            'trialDurationDays' => TrialSetting::current()->trial_duration_days,
            'siteNavigation' => SiteNavigation::published(),
        ]);
    }
}
