import { Toaster as Sonner } from 'sonner';
import type { ToasterProps } from 'sonner';
import { useAppearance } from '@/hooks/use-appearance';
import { useFlashToast } from '@/hooks/use-flash-toast';

/**
 * Sonner manages toast placement and timing. `notify` renders custom cards;
 * direct Sonner calls use its built-in coloured styles.
 */
function Toaster({ ...props }: ToasterProps) {
    const { appearance } = useAppearance();

    useFlashToast();

    return (
        <Sonner
            theme={appearance}
            className="toaster group"
            position="top-center"
            // Clears the 52px app header so a toast never sits on top of it.
            offset={64}
            gap={10}
            visibleToasts={4}
            style={{ '--width': '400px' } as React.CSSProperties}
            richColors
            toastOptions={{
                classNames: {
                    loading:
                        '!border-blue-200 !bg-blue-50 !text-blue-900 dark:!border-blue-800 dark:!bg-blue-950 dark:!text-blue-100',
                },
            }}
            {...props}
        />
    );
}

export { Toaster };
