import type { GeneratedPaperHeader } from '../types';

interface FormalExamHeaderProps {
    header: GeneratedPaperHeader;
    onChange: (field: keyof GeneratedPaperHeader, value: string) => void;
}

export function FormalExamHeader({ header, onChange }: FormalExamHeaderProps) {
    return (
        <div data-paper-header-frame data-paper-header>
            {/* Top row: initials | school name (large centered) | marks box */}
            <div
                data-paper-header-divider="b"
                className="grid grid-cols-[9rem_1fr_9rem]"
            >
                <div
                    data-paper-header-divider="r"
                    className="flex items-center justify-center p-3"
                >
                    <div className="flex size-20 items-center justify-center rounded-full border-2 border-current text-center text-2xl leading-none font-bold">
                        {header.schoolName
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join('')
                            .toUpperCase() || 'TM'}
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center px-4 py-2 text-center">
                    <input
                        value={header.schoolName}
                        onChange={(e) => onChange('schoolName', e.target.value)}
                        className="w-full bg-transparent text-center text-2xl font-extrabold uppercase outline-none"
                        placeholder="School Name"
                    />
                    <div className="mt-0.5 flex items-center gap-4">
                        <input
                            value={header.subject}
                            onChange={(e) => onChange('subject', e.target.value)}
                            className="bg-transparent text-center font-bold outline-none"
                            placeholder="Subject"
                        />
                        <span className="text-slate-400">|</span>
                        <input
                            value={header.exam}
                            onChange={(e) => onChange('exam', e.target.value)}
                            className="bg-transparent text-center font-semibold outline-none"
                            placeholder="Exam / Year"
                        />
                    </div>
                </div>

                <div
                    data-paper-header-divider="r"
                    className="flex flex-col items-center justify-center gap-0.5 p-2 text-center"
                    style={{ direction: 'ltr' }}
                >
                    <span className="text-xs font-bold uppercase text-slate-500">
                        Marks
                    </span>
                    <input
                        value={String(header.marks ?? '')}
                        onChange={(e) => onChange('marks', e.target.value)}
                        className="w-full bg-transparent text-center text-xl font-extrabold outline-none print:font-black"
                    />
                </div>
            </div>

            {/* Row 2: Subject | Class | Type | Duration */}
            <div
                data-paper-header-divider="b"
                className="grid grid-cols-4"
            >
                <LabeledCell label="Class" field="className" header={header} onChange={onChange} divider />
                <LabeledCell label="Section" field="section" header={header} onChange={onChange} divider />
                <LabeledCell label="Exam Type" field="type" header={header} onChange={onChange} divider />
                <LabeledCell label="Duration" field="duration" header={header} onChange={onChange} />
            </div>

            {/* Row 3: Name | Roll No | Date */}
            <div className="grid grid-cols-[2fr_1fr_1fr]">
                <LabeledCell label="Student Name" field="studentName" header={header} onChange={onChange} divider />
                <LabeledCell label="Roll No" field="rollNo" header={header} onChange={onChange} divider />
                <LabeledCell label="Date" field="date" header={header} onChange={onChange} />
            </div>
        </div>
    );
}

function LabeledCell({
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
            className="grid grid-cols-[auto_1fr]"
        >
            <div className="bg-slate-100 px-2 py-1 text-xs font-bold uppercase">
                {label}
            </div>
            <input
                value={String(header[field] ?? '')}
                onChange={(e) => onChange(field, e.target.value)}
                className="h-full min-w-0 bg-transparent px-2 py-1 font-semibold outline-none print:font-bold"
            />
        </div>
    );
}
