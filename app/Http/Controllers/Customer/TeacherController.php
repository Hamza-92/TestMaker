<?php

namespace App\Http\Controllers\Customer;

use App\Enums\TeacherPermission;
use App\Enums\UserType;
use App\Http\Controllers\Controller;
use App\Models\Pattern;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use App\Support\SubscriptionAccess;
use App\Support\TeacherAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class TeacherController extends Controller
{
    public function index()
    {
        $owner = auth()->user();
        $subscription = $owner->activeSchoolSubscription();

        if ($upgrade = $this->upgradeViewIfBlocked($owner, $subscription)) {
            return $upgrade;
        }

        $teachers = $owner->teachers()
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'email', 'status', 'teacher_permissions', 'created_at'])
            ->map(fn (User $teacher) => [
                'id'                  => $teacher->id,
                'name'                => $teacher->name,
                'email'               => $teacher->email,
                'status'              => $teacher->status?->value,
                'permission_count'    => count((array) ($teacher->teacher_permissions ?? [])),
                'created_at'          => $teacher->created_at?->toISOString(),
            ]);

        return Inertia::render('customer/teachers/index', [
            'teachers' => $teachers,
            'quota'    => [
                'used'  => $teachers->count(),
                'max'   => $subscription?->max_teachers,
                'allow' => (bool) ($subscription?->allow_teachers ?? false),
            ],
        ]);
    }

    public function create()
    {
        $owner = auth()->user();
        $subscription = $owner->activeSchoolSubscription();

        if ($upgrade = $this->upgradeViewIfBlocked($owner, $subscription)) {
            return $upgrade;
        }

        $this->ensureCanAddTeacher();

        return Inertia::render('customer/teachers/add');
    }

    public function store(Request $request)
    {
        $this->ensureCanAddTeacher();

        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
            'status'   => ['required', Rule::in(['active', 'inactive', 'suspended'])],
        ]);

        $owner = auth()->user();

        User::create([
            'name'                => $validated['name'],
            'email'               => $validated['email'],
            'password'            => Hash::make($validated['password']),
            'status'              => $validated['status'],
            'user_type'           => UserType::Teacher->value,
            'school_id'           => $owner->id,
            'created_by'          => $owner->id,
            'teacher_permissions' => TeacherPermission::defaults(),
            'access_scope'        => null,
        ]);

        return redirect()->route('customer.teachers.index')
            ->with('success', 'Teacher created successfully.');
    }

    public function edit(User $teacher)
    {
        $this->authorizeTeacher($teacher);

        $owner = auth()->user();
        $subscription = $owner->activeSchoolSubscription();

        if ($upgrade = $this->upgradeViewIfBlocked($owner, $subscription)) {
            return $upgrade;
        }

        return Inertia::render('customer/teachers/edit', [
            'teacher' => $teacher->only(['id', 'name', 'email', 'status']),
        ]);
    }

    public function update(Request $request, User $teacher)
    {
        $this->authorizeTeacher($teacher);

        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($teacher->id)],
            'password' => ['nullable', 'string', 'min:6', 'confirmed'],
            'status'   => ['required', Rule::in(['active', 'inactive', 'suspended'])],
        ]);

        $teacher->name   = $validated['name'];
        $teacher->email  = $validated['email'];
        $teacher->status = $validated['status'];

        if (! empty($validated['password'])) {
            $teacher->password = Hash::make($validated['password']);
        }

        $teacher->save();

        return redirect()->route('customer.teachers.index')
            ->with('success', 'Teacher updated successfully.');
    }

    public function destroy(User $teacher)
    {
        $this->authorizeTeacher($teacher);

        $teacher->delete();

        return redirect()->route('customer.teachers.index')
            ->with('success', 'Teacher removed.');
    }

    public function permissions(User $teacher)
    {
        $this->authorizeTeacher($teacher);

        $owner = auth()->user();
        $subscription = $owner->activeSchoolSubscription();

        if ($upgrade = $this->upgradeViewIfBlocked($owner, $subscription)) {
            return $upgrade;
        }

        $resources = $this->accessResources();
        $ceiling = $subscription
            ? TeacherAccess::schoolCeilingScope($subscription, $resources)
            : [];

        $teacherScope = TeacherAccess::boundedScope($teacher->access_scope, $ceiling, $resources);

        $catalog = collect(TeacherPermission::cases())->map(fn (TeacherPermission $case) => [
            'name'        => $case->value,
            'label'       => $case->label(),
            'description' => $case->description(),
        ])->values();

        return Inertia::render('customer/teachers/permissions', [
            'teacher' => [
                'id'                  => $teacher->id,
                'name'                => $teacher->name,
                'email'               => $teacher->email,
                'teacher_permissions' => (array) ($teacher->teacher_permissions ?? []),
                'access_scope'        => $teacherScope,
            ],
            'permissionCatalog' => $catalog,
            'ceilingScope'      => $ceiling,
            'patterns'          => $resources['patterns'],
            'classes'           => $resources['classes'],
            'subjects'          => $resources['subjects'],
            'patternClassMap'   => $this->limitPatternClassMap($resources['patternClassMap'], $ceiling),
            'classSubjectMap'   => $this->limitClassSubjectMap($resources['classSubjectMap'], $ceiling),
        ]);
    }

    public function updatePermissions(Request $request, User $teacher)
    {
        $this->authorizeTeacher($teacher);

        $validated = $request->validate([
            'permissions'   => ['array'],
            'permissions.*' => ['string', Rule::in(TeacherPermission::values())],
            'access_scope'  => ['nullable', 'array'],
        ]);

        $owner = auth()->user();
        $subscription = $owner->activeSchoolSubscription();

        $resources = $this->accessResources();
        $ceiling = $subscription
            ? TeacherAccess::schoolCeilingScope($subscription, $resources)
            : [];

        $teacher->teacher_permissions = array_values(array_unique($validated['permissions'] ?? []));
        $teacher->access_scope = TeacherAccess::boundedScope(
            $validated['access_scope'] ?? null,
            $ceiling,
            $resources,
        );
        $teacher->save();

        return redirect()->route('customer.teachers.index')
            ->with('success', 'Teacher access updated.');
    }

    private function ensureCanAddTeacher(): void
    {
        $owner = auth()->user();
        $subscription = $owner->activeSchoolSubscription();

        if ($subscription === null || ! $subscription->allow_teachers) {
            throw ValidationException::withMessages([
                'quota' => 'Your current plan does not include teacher management.',
            ]);
        }

        $current = $owner->teachers()->count();
        $limit = $subscription->max_teachers;

        if ($limit !== null && $current >= $limit) {
            throw ValidationException::withMessages([
                'quota' => "Teacher limit reached ({$limit}). Upgrade your plan to add more.",
            ]);
        }
    }

    private function upgradeViewIfBlocked(User $owner, ?\App\Models\Subscription $subscription)
    {
        if ($subscription !== null && $subscription->allow_teachers) {
            return null;
        }

        $reason = $subscription === null ? 'no_subscription' : 'plan_excludes_teachers';

        return Inertia::render('customer/teachers/upgrade', [
            'reason'      => $reason,
            'planName'    => $subscription?->name,
            'accountType' => $owner->account_type?->value,
            'expiresAt'   => $subscription?->expired_at?->toISOString(),
            'features'    => [
                'Add teachers to your school account',
                'Assign patterns, classes, and subjects per teacher',
                'Control which features each teacher can access',
                'Track paper activity per teacher',
            ],
            'support'     => [
                'email' => config('mail.support_address') ?: 'support@testmaker.app',
                'phone' => config('app.support_phone'),
            ],
        ]);
    }

    private function authorizeTeacher(User $teacher): void
    {
        abort_unless(
            $teacher->isTeacher() && (int) $teacher->school_id === (int) auth()->id(),
            404,
        );
    }

    private function accessResources(): array
    {
        return [
            'patterns' => Pattern::where('status', 1)->orderBy('name')->get(['id', 'name', 'short_name']),
            'classes'  => SchoolClass::where('status', 1)->orderBy('name')->get(['id', 'name']),
            'subjects' => Subject::where('status', 1)->orderBy('name_eng')->get(['id', 'name_eng', 'name_ur']),
            ...SubscriptionAccess::buildMaps(),
        ];
    }

    private function limitPatternClassMap(array $patternClassMap, ?array $ceiling): array
    {
        if ($ceiling === null) {
            return $patternClassMap;
        }

        $limited = [];

        foreach ($ceiling as $patternKey => $patternRule) {
            $classIds = array_map('intval', array_keys($patternRule['classes'] ?? []));
            $limited[(string) $patternKey] = array_values(array_intersect(
                $patternClassMap[(string) $patternKey] ?? [],
                $classIds,
            ));
        }

        return $limited;
    }

    private function limitClassSubjectMap(array $classSubjectMap, ?array $ceiling): array
    {
        if ($ceiling === null) {
            return $classSubjectMap;
        }

        $limited = [];

        foreach ($ceiling as $patternKey => $patternRule) {
            foreach ($patternRule['classes'] ?? [] as $classKey => $classRule) {
                $key = "{$patternKey}:{$classKey}";
                $ceilingSubjects = $classRule['subjects'];
                $available = $classSubjectMap[$key] ?? [];

                $limited[$key] = $ceilingSubjects === null
                    ? $available
                    : array_values(array_intersect($available, $ceilingSubjects));
            }
        }

        return $limited;
    }
}
