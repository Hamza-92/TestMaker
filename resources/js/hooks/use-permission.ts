import { usePage } from '@inertiajs/react';
import type { Auth } from '@/types';

export function usePermission() {
    const { auth } = usePage<{ auth: Auth }>().props;

    const can = (permission: string): boolean => {
        if (auth.is_master) return true;
        return auth.permissions?.includes(permission) ?? false;
    };

    return { can, isMaster: auth.is_master };
}
