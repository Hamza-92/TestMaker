import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useAppearance } from '@/hooks/use-appearance';
import { useFlashToast } from '@/hooks/use-flash-toast';

/**
 * Sonner is kept purely as the engine — stacking, timers, pause-on-hover,
 * swipe-to-dismiss. Every toast is rendered by our own component via
 * `notify` in components/tm/toast, so `unstyled` turns off sonner's own
 * chrome; without it our card would sit inside a second bordered box.
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
            // Sonner's own chrome is neutralised rather than switched off
            // with `unstyled`: its layout rules (width, absolute position,
            // stack transforms) live in the same styled block, so unstyled
            // collapsed every toast into the container's top-left corner.
            toastOptions={{
                classNames: {
                    toast: '!bg-transparent !border-0 !shadow-none !p-0 !w-full',
                },
            }}
            {...props}
        />
    );
}

export { Toaster };
