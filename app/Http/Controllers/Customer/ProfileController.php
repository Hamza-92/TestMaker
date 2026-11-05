<?php

namespace App\Http\Controllers\Customer;

use App\Enums\AccountType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\ProfileUpdateRequest;
use App\Support\SubscriptionQuestionQuota;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('customer/profile', [
            'user' => $request->user()->only([
                'name', 'email', 'phone', 'school_name', 'address', 'city', 'province', 'logo', 'account_type',
            ]),
            'status' => $request->session()->get('status'),
            'canUpdateProfile' => $request->user()->schoolOwner()?->account_type !== AccountType::Trial,
            'questionQuota' => SubscriptionQuestionQuota::summary($request->user()->activeSchoolSubscription()),
        ]);
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        if (($validated['remove_logo'] ?? false) && $user->logo) {
            Storage::disk('public')->delete($user->logo);
            $validated['logo'] = null;
        } elseif ($request->hasFile('logo')) {
            if ($user->logo) {
                Storage::disk('public')->delete($user->logo);
            }

            $validated['logo'] = $request->file('logo')->store('logos', 'public');
        }

        unset($validated['remove_logo']);

        $user->fill($validated);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Profile updated.']);

        return back();
    }
}
