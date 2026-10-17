export function formatPaperHeaderDate(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

export function normalizePaperHeaderDateInput(value: string): string {
    const match = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(value);

    if (!match) {
        return value;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    if (
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > new Date(year, month, 0).getDate()
    ) {
        return value;
    }

    return `${match[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
