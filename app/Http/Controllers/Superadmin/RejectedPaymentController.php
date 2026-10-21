<?php

namespace App\Http\Controllers\Superadmin;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\PaymentLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RejectedPaymentController extends Controller
{
    public function resubmit(Request $request, PaymentLog $paymentLog)
    {
        $recorder = $request->user();
        abort_unless((int) $paymentLog->created_by === (int) $recorder->id, 404);

        $validated = $request->validate([
            'remarks' => ['required', 'string', 'max:1000'],
        ]);

        $remarks = trim($validated['remarks']);
        if ($remarks === '') {
            throw ValidationException::withMessages(['remarks' => 'Enter your remarks.']);
        }

        DB::transaction(function () use ($paymentLog, $remarks, $recorder): void {
            $locked = PaymentLog::query()
                ->where('created_by', $recorder->id)
                ->lockForUpdate()
                ->findOrFail($paymentLog->id);

            if ($locked->status !== PaymentStatus::Rejected) {
                throw ValidationException::withMessages(['remarks' => 'This payment is no longer rejected.']);
            }

            $locked->resubmitWithRemarks($remarks, $recorder);
        });

        return back()->with('success', 'Payment sent for review.');
    }
}
