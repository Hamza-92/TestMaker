import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import { CustomerHeader } from './customer-header';
import { CustomerSidebar } from './customer-sidebar';

const SIDEBAR_STORAGE_KEY = 'customer-sidebar-collapsed';

interface SidebarState {
    collapsed: boolean;
    toggleCollapsed: () => void;
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarState | null>(null);

export function useCustomerSidebar(): SidebarState {
    const ctx = useContext(SidebarContext);

    if (!ctx) {
        throw new Error(
            'useCustomerSidebar must be used within CustomerLayout',
        );
    }

    return ctx;
}

export default function CustomerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [collapsed, setCollapsed] = useState(
        () =>
            typeof window !== 'undefined' &&
            localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1',
    );
    const [mobileOpen, setMobileOpen] = useState(false);

    const toggleCollapsed = useCallback(() => {
        setCollapsed((c) => {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, c ? '0' : '1');

            return !c;
        });
    }, []);

    // Scope the customer theme tokens to <body> so Radix portals
    // (dialogs, dropdowns, selects) inherit them too.
    useEffect(() => {
        document.body.classList.add('theme-customer');

        return () => document.body.classList.remove('theme-customer');
    }, []);

    return (
        <SidebarContext.Provider
            value={{ collapsed, toggleCollapsed, mobileOpen, setMobileOpen }}
        >
            <div
                data-customer-layout
                className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950"
            >
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
        </SidebarContext.Provider>
    );
}
