<?php

namespace App\Http\Controllers;

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
            'trialDurationDays' => QatTrial::DURATION_DAYS,
            'siteNavigation' => SiteNavigation::published(),
        ]);
    }
}
