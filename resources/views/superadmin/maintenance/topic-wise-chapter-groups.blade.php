<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Topic-wise Chapter Group Cleanup</title>
    <style>
        :root { color-scheme: light; font-family: Arial, sans-serif; }
        body { margin: 0; background: #f4f7fb; color: #172033; }
        main { width: min(1100px, calc(100% - 32px)); margin: 40px auto; }
        .card { overflow: hidden; border: 1px solid #dbe3ef; border-radius: 14px; background: #fff; box-shadow: 0 12px 35px rgba(15, 23, 42, .08); }
        header { padding: 22px 24px; border-bottom: 1px solid #e8edf5; }
        h1 { margin: 0 0 8px; font-size: 22px; }
        p { margin: 0; color: #536077; line-height: 1.5; }
        .content { padding: 24px; }
        .status { margin-bottom: 16px; padding: 12px 14px; border-radius: 9px; font-weight: 700; }
        .success { background: #ecfdf3; color: #166534; }
        .error { background: #fef2f2; color: #991b1b; }
        pre { overflow: auto; max-height: 58vh; margin: 0; padding: 16px; border-radius: 9px; background: #0f172a; color: #e2e8f0; font: 12px/1.55 Consolas, monospace; white-space: pre; }
        form { margin-top: 20px; }
        button, a { display: inline-block; border: 0; border-radius: 9px; padding: 11px 16px; font-size: 14px; font-weight: 700; text-decoration: none; cursor: pointer; }
        button { background: #b91c1c; color: #fff; }
        button:hover { background: #991b1b; }
        a { margin-left: 8px; background: #e8edf5; color: #26344f; }
        .warning { margin-top: 12px; font-size: 13px; color: #7c2d12; }
    </style>
</head>
<body>
<main>
    <section class="card">
        <header>
            <h1>Topic-wise Chapter Group Cleanup</h1>
            <p>This temporary page is restricted to authorized superadmins. Previewing makes no database changes.</p>
        </header>
        <div class="content">
            <div class="status {{ $exitCode === 0 ? 'success' : 'error' }}">
                @if ($exitCode !== 0)
                    The operation failed. No unverified cleanup changes were committed.
                @elseif ($applied)
                    Cleanup completed. Check the output for the backup table and final verification.
                @else
                    Dry-run preview completed. Review the affected records before applying.
                @endif
            </div>

            <pre>{{ $output }}</pre>

            @if (! $applied && $exitCode === 0)
                <form method="POST" action="{{ route('superadmin.maintenance.topic-wise-chapter-groups.apply') }}" onsubmit="return confirm('Create a verified backup and remove group data from every topic-wise chapter shown above?');">
                    @csrf
                    <button type="submit">Back Up and Apply Cleanup</button>
                </form>
                <p class="warning">The button creates and verifies a timestamped backup before updating any chapter.</p>
            @else
                <a href="{{ route('superadmin.maintenance.topic-wise-chapter-groups') }}">Run verification again</a>
            @endif
        </div>
    </section>
</main>
</body>
</html>
