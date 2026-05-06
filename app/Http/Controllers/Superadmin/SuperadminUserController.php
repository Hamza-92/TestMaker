<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SuperadminUserController extends Controller
{
    public function index()
    {
        $users = User::where('user_type', UserType::SuperAdmin)
            ->whereNotNull('created_by')
            ->with('creator:id,name')
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'email', 'status', 'created_at', 'created_by'])
            ->map(fn (User $user) => [
                'id'           => $user->id,
                'name'         => $user->name,
                'email'        => $user->email,
                'status'       => $user->status?->value,
                'created_at'   => $user->created_at?->toISOString(),
                'created_by'   => $user->creator?->name,
            ]);

        return Inertia::render('superadmin/users', ['users' => $users]);
    }

    public function create()
    {
        return Inertia::render('superadmin/users/add');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:3', 'confirmed'],
            'status'   => ['required', Rule::in(['active', 'inactive', 'suspended'])],
        ]);

        User::create([
            'name'       => $validated['name'],
            'email'      => $validated['email'],
            'password'   => Hash::make($validated['password']),
            'status'     => $validated['status'],
            'user_type'  => UserType::SuperAdmin->value,
            'created_by' => auth()->id(),
        ]);

        return redirect()->route('superadmin.users')
            ->with('success', 'User created successfully.');
    }

    public function edit(User $user)
    {
        abort_if($user->isMasterSuperAdmin(), 403);
        abort_unless($user->isSuperAdmin(), 404);

        return Inertia::render('superadmin/users/edit', [
            'user' => $user->only(['id', 'name', 'email', 'status']),
        ]);
    }

    public function update(Request $request, User $user)
    {
        abort_if($user->isMasterSuperAdmin(), 403);
        abort_unless($user->isSuperAdmin(), 404);

        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:3', 'confirmed'],
            'status'   => ['required', Rule::in(['active', 'inactive', 'suspended'])],
        ]);

        $user->name   = $validated['name'];
        $user->email  = $validated['email'];
        $user->status = $validated['status'];

        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        return redirect()->route('superadmin.users')
            ->with('success', 'User updated successfully.');
    }

    public function destroy(User $user)
    {
        abort_if($user->isMasterSuperAdmin(), 403);
        abort_unless($user->isSuperAdmin(), 404);

        $user->delete();

        return redirect()->route('superadmin.users')
            ->with('success', 'User deleted successfully.');
    }
}
