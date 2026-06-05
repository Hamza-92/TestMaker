import { CustomerHeader } from './customer-header';
import { CustomerSidebar } from './customer-sidebar';

export default function CustomerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div data-customer-layout className="flex h-screen overflow-hidden">
            <CustomerSidebar />
            <div
                data-customer-main
                className="flex min-w-0 flex-1 flex-col overflow-hidden"
            >
                <CustomerHeader />
                <main
                    data-customer-content
                    className="flex-1 overflow-y-auto p-4 md:p-6"
                >
                    {children}
                </main>
            </div>
        </div>
    );
}
