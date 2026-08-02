import { Label } from '@/components/ui/label';
import {
    PATTERN_COLOR_OPTIONS,
    PATTERN_ICON_OPTIONS,
} from '@/lib/pattern-appearance';
import { cn } from '@/lib/utils';

export function PatternAppearanceFields({
    description,
    icon,
    color,
    onDescriptionChange,
    onIconChange,
    onColorChange,
    errors,
}: {
    description: string;
    icon: string;
    color: string;
    onDescriptionChange: (value: string) => void;
    onIconChange: (value: string) => void;
    onColorChange: (value: string) => void;
    errors?: {
        description?: string;
        icon?: string;
        color?: string;
    };
}) {
    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <Label htmlFor="pattern-description">Description</Label>
                <textarea
                    id="pattern-description"
                    value={description}
                    onChange={(event) =>
                        onDescriptionChange(event.target.value)
                    }
                    maxLength={180}
                    rows={3}
                    placeholder="A short line shown on the customer dashboard"
                    className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:ring-[3px]"
                />
                <div className="flex justify-between gap-3">
                    <p className="text-muted-foreground text-xs">
                        Keep it useful and concise.
                    </p>
                    <span className="text-muted-foreground text-xs tabular-nums">
                        {description.length}/180
                    </span>
                </div>
                {errors?.description && (
                    <p className="text-destructive text-xs">
                        {errors.description}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Dashboard icon</Label>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
                    {PATTERN_ICON_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const selected = icon === option.value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                title={option.label}
                                aria-label={option.label}
                                aria-pressed={selected}
                                onClick={() => onIconChange(option.value)}
                                className={cn(
                                    'flex aspect-square cursor-pointer items-center justify-center rounded-lg border transition-colors',
                                    selected
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-input hover:bg-accent text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <Icon className="size-4" />
                            </button>
                        );
                    })}
                </div>
                {errors?.icon && (
                    <p className="text-destructive text-xs">{errors.icon}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Dashboard color</Label>
                <div className="flex flex-wrap gap-2">
                    {PATTERN_COLOR_OPTIONS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            aria-label={`Use ${option}`}
                            aria-pressed={color === option}
                            onClick={() => onColorChange(option)}
                            className={cn(
                                'flex size-8 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-105',
                                color === option &&
                                    'ring-primary ring-2 ring-offset-2',
                            )}
                            style={{ backgroundColor: option }}
                        >
                            {color === option && (
                                <span className="size-2 rounded-full bg-white" />
                            )}
                        </button>
                    ))}
                </div>
                {errors?.color && (
                    <p className="text-destructive text-xs">{errors.color}</p>
                )}
            </div>
        </div>
    );
}
