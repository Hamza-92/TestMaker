<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Support\LegacyTransfer\LegacyUserTransferService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class UserTransferController extends Controller
{
    public function index(LegacyUserTransferService $transfer): Response
    {
        return Inertia::render('superadmin/user-transfer', $transfer->indexData());
    }

    public function show(int $sourceUserId, LegacyUserTransferService $transfer): JsonResponse
    {
        try {
            return response()->json($transfer->detail($sourceUserId));
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function store(Request $request, int $sourceUserId, LegacyUserTransferService $transfer): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'phone' => ['nullable', 'string', 'max:30'],
            'school_name' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'province' => ['nullable', 'string', 'max:100'],
            'is_show_address' => ['boolean'],
            'account_type' => ['required', 'in:paid,trial'],
            'user_status' => ['required', 'in:active,inactive,suspended'],
            'subscription_name' => ['required', 'string', 'max:255'],
            'started_at' => ['required', 'date'],
            'expired_at' => ['required', 'date', 'after:started_at'],
            'subscription_status' => ['required', 'in:active,expired,cancelled'],
            'amount' => ['required', 'numeric', 'min:0'],
            'payment_plan' => ['nullable', 'string', 'max:20000'],
            'next_payment_date' => ['nullable', 'date'],
            'is_question_based' => ['boolean'],
            'allowed_questions' => ['nullable', 'integer', 'min:0'],
            'remaining_questions' => ['nullable', 'integer', 'min:0', 'lte:allowed_questions'],
            'allow_subjective_answers' => ['boolean'],
            'access_scope' => ['nullable', 'array'],
            'warnings' => ['nullable', 'array'],
            'warnings.*' => ['string', 'max:500'],
        ]);

        try {
            $import = $transfer->transfer($sourceUserId, $validated, (int) $request->user()->id);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['transfer' => $exception->getMessage()]);
        }

        return response()->json([
            'message' => 'TestMaker account transferred successfully.',
            'source_user_id' => $sourceUserId,
            'target_user_id' => $import->target_user_id,
            'subscription_id' => $import->subscription_id,
            'transferred_at' => $import->transferred_at?->toIso8601String(),
        ]);
    }
}
