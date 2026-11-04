<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reset Customer Payments</title>
    <style>
        body { max-width: 720px; margin: 32px auto; padding: 0 16px; font: 15px/1.5 Arial, sans-serif; color: #172033; }
        pre { overflow: auto; padding: 16px; background: #f1f5f9; border: 1px solid #cbd5e1; }
        label { display: block; margin: 16px 0; }
        input[type=text] { display: block; width: min(100%, 320px); padding: 8px; }
        button { padding: 10px 16px; color: #fff; background: #b91c1c; border: 0; cursor: pointer; }
        .error { color: #b91c1c; }
    </style>
</head>
<body>
    <h1>Reset Customer Payments</h1>
    <p>Temporary maintenance page. This reset deletes customer payment logs and their audit entries, sets customer subscription amounts to Rs 0, clears subscription commissions and payment due dates, and removes customer payment holds. Subscription status, dates, and access remain unchanged. Receipt files remain on disk.</p>

    @if ($exitCode !== 0)
        <p class="error">The operation failed. Review the output below.</p>
    @elseif ($applied)
        <p>Reset completed. Customer payments and subscription amounts now start from zero.</p>
    @else
        <p>Dry-run preview. No records have been changed.</p>
    @endif

    <pre>{{ $output }}</pre>

    @if (! $applied && $exitCode === 0)
        <p>Back up <code>payment_logs</code>, <code>subscriptions</code>, <code>users</code>, and <code>audit_logs</code> before continuing.</p>
        <form method="POST" action="{{ route('superadmin.payments.reset.apply') }}">
            @csrf
            <label><input type="checkbox" name="backup_confirmed" value="1" required> I have backed up these four tables.</label>
            @error('backup_confirmed') <p class="error">{{ $message }}</p> @enderror
            <label>Type <strong>CLEAR PAYMENTS</strong> to confirm:
                <input type="text" name="confirmation" autocomplete="off" required>
            </label>
            @error('confirmation') <p class="error">{{ $message }}</p> @enderror
            <button type="submit">Clear customer payments</button>
        </form>
    @else
        <p><a href="{{ route('superadmin.payments.reset') }}">View current counts</a></p>
    @endif

    <p><a href="{{ route('superadmin.payments') }}">Back to Payments</a></p>
</body>
</html>
