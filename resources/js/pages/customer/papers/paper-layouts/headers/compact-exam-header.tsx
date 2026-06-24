import type { GeneratedPaperHeader } from '../types';

interface CompactExamHeaderProps {
    header: GeneratedPaperHeader;
    onChange: (field: keyof GeneratedPaperHeader, value: string) => void;
}

export function CompactExamHeader({
    header,
    onChange,
}: CompactExamHeaderProps) {
    return (
        <div data-paper-header-frame data-paper-header>
            {/* Row 1: school name (left) | subject (center) | initials circle (right) */}
            <div
                data-paper-header-divider="b"
                className="grid grid-cols-3 items-center"
            >
                <input
                    value={header.schoolName}
                    onChange={(e) => onChange('schoolName', e.target.value)}
                    className="bg-transparent px-3 py-1.5 text-lg font-bold uppercase outline-none print:font-extrabold"
                    placeholder="School Name"
                />
                <input
                    value={header.subject}
                    onChange={(e) => onChange('subject', e.target.value)}
                    className="bg-transparent px-3 py-1.5 text-center font-bold outline-none print:font-extrabold"
                    placeholder="Subject"
                />
                <div className="flex items-center justify-end px-3 py-1.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-current text-center text-sm font-bold leading-none">
                        {header.schoolName
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join('')
                            .toUpperCase() || 'TM'}
                    </div>
                </div>
            </div>

            {/* Row 2: 6 equal columns — Name | Class | Exam | Date | Roll | Marks */}
            <div className="grid grid-cols-6">
                <CompactField label="Name" field="studentName" header={header} onChange={onChange} divider />
                <CompactField label="Class" field="className" header={header} onChange={onChange} divider />
                <CompactField label="Exam" field="exam" header={header} onChange={onChange} divider />
                <CompactField label="Date" field="date" header={header} onChange={onChange} divider />
                <CompactField label="Roll" field="rollNo" header={header} onChange={onChange} divider />
                <CompactField label="Marks" field="marks" header={header} onChange={onChange} />
            </div>
        </div>
    );
}

function CompactField({
    label,
    field,
    header,
    onChange,
    divider = false,
}: {
    label: string;
    field: keyof GeneratedPaperHeader;
    header: GeneratedPaperHeader;
    onChange: (field: keyof GeneratedPaperHeader, value: string) => void;
    divider?: boolean;
}) {
    return (
        <div
            data-paper-header-divider={divider ? 'r' : undefined}
            className="flex min-w-0 flex-col overflow-hidden px-3 py-1"
        >
            <span className="shrink-0 text-xs font-bold uppercase text-slate-500">
                {label}
            </span>
            <input
                value={String(header[field] ?? '')}
                onChange={(e) => onChange(field, e.target.value)}
                className="w-full min-w-0 border-b border-current bg-transparent text-sm font-semibold outline-none print:font-bold"
            />
        </div>
    );
}
