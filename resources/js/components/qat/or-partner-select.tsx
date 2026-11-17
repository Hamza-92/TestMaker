import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type OrPartnerOption = {
    typeId: number;
    typeName: string;
    partnerId: number;
    partnerName: string;
    selected: boolean;
};

export type AutoOrOption = {
    typeId: number;
    typeName: string;
    value: string;
    label: string;
    defaultLabel: string;
    defaultAvailable: boolean;
    singleChoices: { id: number; name: string; available: boolean }[];
};

const triggerClass =
    'w-auto max-w-full rounded-lg border-violet-200 bg-white text-xs font-semibold text-violet-800 hover:border-violet-400 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200';
const contentClass =
    'rounded-xl border-violet-200 bg-white dark:border-violet-800 dark:bg-slate-900';

export function QatAutoOrSelect({
    option,
    onChange,
}: {
    option: AutoOrOption;
    onChange: (typeId: number, memberId: number | null) => void;
}) {
    return (
        <Select
            value={option.value}
            onValueChange={(value) =>
                onChange(
                    option.typeId,
                    value === 'default' ? null : Number(value),
                )
            }
        >
            <SelectTrigger
                aria-label={`OR choices for ${option.typeName}`}
                size="sm"
                className={triggerClass}
                title={option.label}
            >
                <span className="min-w-0 truncate">
                    <SelectValue>{option.label}</SelectValue>
                </span>
            </SelectTrigger>
            <SelectContent align="end" className={contentClass}>
                <SelectItem
                    value="default"
                    disabled={!option.defaultAvailable}
                    className="text-xs"
                >
                    {option.defaultLabel}
                </SelectItem>
                {option.singleChoices.map(({ id, name, available }) => (
                    <SelectItem
                        key={id}
                        value={String(id)}
                        disabled={!available}
                        className="text-xs"
                    >
                        {name} only
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export function QatOrPartnerSelect({
    option,
    onChange,
}: {
    option: OrPartnerOption;
    onChange: (typeId: number, partnerId: number | null) => void;
}) {
    return (
        <Select
            value={option.selected ? String(option.partnerId) : 'none'}
            onValueChange={(value) =>
                onChange(
                    option.typeId,
                    value === 'none' ? null : option.partnerId,
                )
            }
        >
            <SelectTrigger
                aria-label={`OR partner for ${option.typeName}`}
                size="sm"
                className={triggerClass}
            >
                <span className="min-w-0 truncate">
                    <SelectValue>
                        {option.selected ? `OR ${option.partnerName}` : 'OR'}
                    </SelectValue>
                </span>
            </SelectTrigger>
            <SelectContent align="start" className={contentClass}>
                <SelectItem value="none" className="text-xs">
                    No partner
                </SelectItem>
                <SelectItem
                    value={String(option.partnerId)}
                    className="text-xs"
                >
                    OR {option.partnerName}
                </SelectItem>
            </SelectContent>
        </Select>
    );
}
