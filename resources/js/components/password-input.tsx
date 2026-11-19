import { Eye, EyeOff } from 'lucide-react';
import type { ComponentProps, Ref } from 'react';
import { useState } from 'react';
import { Input as CustomerInput } from '@/components/tm';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function PasswordInput({
    className,
    ref,
    appearance = 'default',
    ...props
}: Omit<ComponentProps<'input'>, 'type'> & {
    ref?: Ref<HTMLInputElement>;
    appearance?: 'default' | 'customer';
}) {
    const [showPassword, setShowPassword] = useState(false);
    const InputComponent = appearance === 'customer' ? CustomerInput : Input;

    return (
        <div className="relative">
            <InputComponent
                type={showPassword ? 'text' : 'password'}
                className={cn('pr-10', className)}
                ref={ref}
                {...props}
            />
            <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className={cn(
                    'absolute inset-y-0 right-0 flex items-center px-3 focus-visible:outline-none',
                    appearance === 'customer'
                        ? 'rounded-r-lg text-slate-400 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-slate-500 dark:hover:text-brand-400'
                        : 'rounded-r-md text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring',
                )}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={appearance === 'customer' ? 0 : -1}
            >
                {showPassword ? (
                    <EyeOff className="size-4" />
                ) : (
                    <Eye className="size-4" />
                )}
            </button>
        </div>
    );
}
