import { CustomerHeader } from './customer-header';
import { CustomerSidebar } from './customer-sidebar';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden">
            <CustomerSidebar />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <CustomerHeader />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
