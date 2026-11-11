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
                className="w-auto max-w-full rounded-lg border-violet-200 bg-white text-xs font-semibold text-violet-800 hover:border-violet-400 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200"
            >
                <span className="min-w-0 truncate">
                    <SelectValue>
                        {option.selected ? `OR ${option.partnerName}` : 'OR'}
                    </SelectValue>
                </span>
            </SelectTrigger>
            <SelectContent
                align="start"
                className="rounded-xl border-violet-200 bg-white dark:border-violet-800 dark:bg-slate-900"
            >
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
