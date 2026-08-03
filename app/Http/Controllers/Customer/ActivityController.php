<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\CustomerActivityData;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ActivityController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        abort_unless($user instanceof User, 403);

        $category = $request->string('category')->toString();
        $category = in_array($category, ['papers', 'teachers'], true) ? $category : null;
        $search = trim($request->string('q')->toString());

        return Inertia::render('customer/activity', [
            'items' => CustomerActivityData::page($user, $category, $search),
            'counts' => CustomerActivityData::counts($user),
            'filters' => [
                'category' => $category ?? 'all',
                'q' => $search,
            ],
        ]);
    }
}
