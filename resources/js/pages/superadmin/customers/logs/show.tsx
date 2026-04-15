import { Head, Link } from '@inertiajs/react';
import { ArrowLeftIcon, LogsIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Customer {
    id: number;
    name: string;
}

interface LogDetail {
    id: number;
    summary: string;
    detail: string | null;
    event: string | null;
    changed_by_name: string | null;
    notes: string | null;
    ip_address: string | null;
    created_at: string | null;
    old_values: Record<string, unknown>;
    new_values: Record<string, unknown>;
}

function fmtDateTime(date: string | null) {
    if (!date) return '-';

    return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export default function ShowCustomerLog({
    customer,
    log,
}: {
    customer: Customer;
    log: LogDetail;
}) {
    return (
        <>
            <Head title={`Customer Log - ${customer.name}`} />

            <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/superadmin/customers/${customer.id}`}
                        className="hover:bg-accent border-input flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Link>
                    <div>
                        <h1 className="h1-semibold">Customer Log</h1>
                        <p className="text-muted-foreground text-sm">Detailed view placeholder for future implementation</p>
                    </div>
                </div>

                <div className="space-y-5 rounded-xl border p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                            <LogsIcon className="size-4" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">{log.summary}</p>
                            {log.detail && <p className="text-muted-foreground text-sm">{log.detail}</p>}
                        </div>
                    </div>

                    <Separator />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <p className="text-muted-foreground text-xs">Date</p>
                            <p className="mt-1 text-sm font-medium">{fmtDateTime(log.created_at)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">Changed By</p>
                            <p className="mt-1 text-sm font-medium">{log.changed_by_name ?? '-'}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">Event</p>
                            <p className="mt-1 text-sm font-medium">{log.event ?? '-'}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">IP Address</p>
                            <p className="mt-1 text-sm font-medium">{log.ip_address ?? '-'}</p>
                        </div>
                    </div>

                    {log.notes && (
                        <>
                            <Separator />
                            <div>
                                <p className="text-muted-foreground text-xs">Notes</p>
                                <p className="mt-1 text-sm">{log.notes}</p>
                            </div>
                        </>
                    )}

                    <Separator />

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                            <p className="text-muted-foreground text-xs">Old Values</p>
                            <pre className="bg-muted/30 overflow-x-auto rounded-lg border p-3 text-xs">
                                {JSON.stringify(log.old_values ?? {}, null, 2)}
                            </pre>
                        </div>
                        <div className="space-y-2">
                            <p className="text-muted-foreground text-xs">New Values</p>
                            <pre className="bg-muted/30 overflow-x-auto rounded-lg border p-3 text-xs">
                                {JSON.stringify(log.new_values ?? {}, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

ShowCustomerLog.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Customers', href: '/superadmin/customers' },
        { title: 'Customer Log' },
    ],
};
