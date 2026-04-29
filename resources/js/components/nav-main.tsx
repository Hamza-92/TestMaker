import { Link, usePage } from '@inertiajs/react';
import { ChevronRightIcon } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

function NavCollapsibleItem({ item }: { item: NavItem }) {
    const page = usePage();
    const currentUrl = page.url;

    const isSubActive = (subHref: string) => currentUrl === subHref || currentUrl.startsWith(subHref + '/');
    const isParentActive =
        currentUrl === item.href ||
        currentUrl.startsWith(item.href + '/') ||
        (item.items ?? []).some((sub) => isSubActive(sub.href));

    const [open, setOpen] = useState(isParentActive);

    return (
        <SidebarMenuItem>
            <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isParentActive} tooltip={{ children: item.title }}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRightIcon className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub>
                        {(item.items ?? []).map((sub) => (
                            <SidebarMenuSubItem key={sub.title}>
                                <SidebarMenuSubButton asChild isActive={isSubActive(sub.href)}>
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
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) =>
                    item.items && item.items.length > 0 ? (
                        <NavCollapsibleItem key={item.title} item={item} />
                    ) : (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isCurrentUrl(item.href)}
                                tooltip={{ children: item.title }}
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
