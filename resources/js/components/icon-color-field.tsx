import type { LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { Label } from '@/components/ui/label';
import {
    DEFAULT_ICON_COLOR,
    ICON_COLOR_OPTIONS,
    iconContainerStyle,
} from '@/lib/icon-appearance';
import { cn } from '@/lib/utils';

export function IconColorField({
    color,
    onChange,
    icon: Icon,
    error,
}: {
    color: string;
    onChange: (color: string) => void;
    icon: LucideIcon;
    error?: string;
}) {
    const id = useId();

    return (
        <div className="space-y-3">
            <Label htmlFor={id}>Icon color</Label>
            <div className="flex flex-wrap items-center gap-3">
                <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                    style={iconContainerStyle(color)}
                    aria-hidden="true"
                >
                    <Icon className="size-5" />
                </span>
                <div className="flex flex-wrap gap-2">
                    {ICON_COLOR_OPTIONS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            title={option}
                            aria-label={`Use ${option}`}
                            aria-pressed={color.toLowerCase() === option}
                            onClick={() => onChange(option)}
                            className={cn(
                                'flex size-8 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2',
                                color.toLowerCase() === option &&
                                    'ring-2 ring-primary ring-offset-2 ring-offset-background',
                            )}
                            style={{ backgroundColor: option }}
                        >
                            {color.toLowerCase() === option && (
                                <span className="size-2 rounded-full bg-white" />
                            )}
                        </button>
                    ))}
                </div>
                <input
                    id={id}
                    type="color"
                    value={color || DEFAULT_ICON_COLOR}
                    onChange={(event) => onChange(event.target.value)}
                    aria-label="Choose a custom icon color"
                    className="size-9 shrink-0 cursor-pointer rounded-lg border border-input bg-background p-1"
                />
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="cursor-pointer text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                    Use default
                </button>
            </div>
            <p className="text-xs text-muted-foreground">
                A solid icon with a matching light background and shadow.
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
