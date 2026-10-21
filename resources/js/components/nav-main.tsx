import { Link, usePage } from '@inertiajs/react';
import { ChevronRightIcon } from 'lucide-react';
import { useState } from 'react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

function NavCollapsibleItem({ item }: { item: NavItem }) {
    const { state, setOpen: setSidebarOpen } = useSidebar();
    const page = usePage();
    const currentPath = page.url.split('?')[0];
    const activeSubHref = (item.items ?? [])
        .filter(
            (sub) =>
                currentPath === sub.href ||
                currentPath.startsWith(sub.href + '/'),
        )
        .sort(
            (first, second) => second.href.length - first.href.length,
        )[0]?.href;

    const isSubActive = (subHref: string) => activeSubHref === subHref;
    const isParentActive =
        currentPath === item.href ||
        currentPath.startsWith(item.href + '/') ||
        activeSubHref !== undefined;

    const [open, setOpen] = useState(isParentActive);

    return (
        <SidebarMenuItem>
            <Collapsible
                open={open}
                onOpenChange={(nextOpen) =>
                    setOpen(state === 'collapsed' ? true : nextOpen)
                }
                className="group/collapsible"
            >
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                        isActive={isParentActive}
                        tooltip={{ children: item.title }}
                        onClick={() => {
                            if (state === 'collapsed') {
                                setSidebarOpen(true);
                            }
                        }}
                        className="h-9 gap-2.5 px-2.5 text-[13px] font-medium text-brand-100/75 hover:bg-white/[0.06] hover:text-white data-[active=true]:bg-brand-600 data-[active=true]:text-white group-data-[collapsible=icon]:mx-auto"
                    >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRightIcon className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub className="border-white/10">
                        {(item.items ?? []).map((sub) => (
                            <SidebarMenuSubItem key={sub.title}>
                                <SidebarMenuSubButton
                                    asChild
                                    isActive={isSubActive(sub.href)}
                                    className="h-auto min-h-7 py-1.5 text-xs leading-snug text-brand-100/70 hover:bg-white/[0.06] hover:text-white data-[active=true]:bg-brand-600 data-[active=true]:text-white"
                                >
                                    <Link href={sub.href} prefetch>
                                        {sub.title}
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </Collapsible>
        </SidebarMenuItem>
    );
}

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="p-0">
            <SidebarGroupLabel className="h-7 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-brand-200/50">
                Administration
            </SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">
                {items.map((item) =>
                    item.items && item.items.length > 0 ? (
                        <NavCollapsibleItem key={item.title} item={item} />
                    ) : (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isCurrentUrl(item.href)}
                                tooltip={{ children: item.title }}
                                className="h-9 gap-2.5 px-2.5 text-[13px] font-medium text-brand-100/75 hover:bg-white/[0.06] hover:text-white data-[active=true]:bg-brand-600 data-[active=true]:text-white group-data-[collapsible=icon]:mx-auto"
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ),
                )}
            </SidebarMenu>
        </SidebarGroup>
    );
}
