import { IconColorField } from '@/components/icon-color-field';
import { Label } from '@/components/ui/label';
import { PATTERN_ICON_OPTIONS, patternIcon } from '@/lib/pattern-appearance';
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
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <div className="flex justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        Keep it useful and concise.
                    </p>
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {description.length}/180
                    </span>
                </div>
                {errors?.description && (
                    <p className="text-xs text-destructive">
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
                                        : 'border-input text-muted-foreground hover:bg-accent hover:text-foreground',
                                )}
                            >
                                <Icon className="size-4" />
                            </button>
                        );
                    })}
                </div>
                {errors?.icon && (
                    <p className="text-xs text-destructive">{errors.icon}</p>
                )}
            </div>

            <IconColorField
                color={color}
                onChange={onColorChange}
                icon={patternIcon(icon)}
                error={errors?.color}
            />
        </div>
    );
}
