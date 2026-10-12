<?php

namespace App\Http\Controllers;

use App\Support\PricingPageContent;
use Inertia\Inertia;
use Inertia\Response;

class PublicPricingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('pricing', ['content' => PricingPageContent::published()]);
    }
}
