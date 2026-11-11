export function QatPastPaperCheckbox({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-sky-100 bg-white/70 px-3 py-2.5 text-xs font-medium text-slate-600 transition-colors focus-within:ring-2 focus-within:ring-brand-500/20 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-sky-700">
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="size-4 shrink-0 accent-brand-600"
            />
            Past paper
        </label>
    );
}
