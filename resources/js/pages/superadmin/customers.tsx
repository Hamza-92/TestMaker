import { Head } from '@inertiajs/react';
import PlusIcon from '@/components/icons/PlusIcon';

export default function Customers() {
    return (
        <>
            <Head title="Customers" />
            <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="h1-semibold">Customers</h1>
                    <div>
                        <button className="flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-3 text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50">
                            <PlusIcon />
                            Add Customer
                        </button>
                    </div>
                </div>
                <div>{/* Table Header */}</div>
            </div>
        </>
    );
}