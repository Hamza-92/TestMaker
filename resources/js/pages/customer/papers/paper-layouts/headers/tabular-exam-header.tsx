import type { GeneratedPaperHeader } from '../types';

interface TabularExamHeaderProps {
    header: GeneratedPaperHeader;
    logoUrl?: string;
    address?: string;
    showAddress?: boolean;
    onChange: (field: keyof GeneratedPaperHeader, value: string) => void;
}

export function TabularExamHeader({
    header,
    logoUrl,
    address,
    showAddress,
    onChange,
}: TabularExamHeaderProps) {
    const initials =
        header.schoolName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase() || 'TM';

    return (
        <div data-paper-header-frame data-paper-header className="grid grid-cols-[5rem_1fr]">
            {/* Logo — spans all 4 rows on the right */}
            <div
                data-paper-header-divider="r"
                className="row-span-4 flex items-center justify-center p-2"
            >
                {logoUrl ? (
                    <img
                        src={logoUrl}
                        alt=""
                        draggable={false}
                        className="max-h-20 max-w-full object-contain"
                    />
                ) : (
                    <div className="flex size-14 items-center justify-center rounded-full border-2 border-current text-lg font-bold leading-none">
                        {initials}
                    </div>
                )}
            </div>

            {/* Row 1: School name + address — centered */}
            <div
                data-paper-header-divider="b"
                className="flex flex-col items-center justify-center py-1.5 text-center"
            >
                <input autoComplete="off"
                    value={header.schoolName}
                    onChange={(e) => onChange('schoolName', e.target.value)}
                    className="w-full bg-transparent text-center text-xl font-bold uppercase outline-none print:font-extrabold"
                    placeholder="School Name"
                />
                {showAddress && address && (
                    <p className="text-sm">( {address} )</p>
                )}
            </div>

            {/* Row 2: Class | Subject | Maximum Marks */}
            <div
                data-paper-header-divider="b"
                className="grid grid-cols-3"
            >
                <InlineField label="Class"         field="className" header={header} onChange={onChange} divider />
                <InlineField label="Subject"       field="subject"   header={header} onChange={onChange} divider />
                <InlineField label="Marks"         field="marks"     header={header} onChange={onChange} />
            </div>

            {/* Row 3: Student Name | Section | Roll No */}
            <div
                data-paper-header-divider="b"
                className="grid grid-cols-3"
            >
                <InlineField label="Student Name" field="studentName" header={header} onChange={onChange} divider />
                <InlineField label="Section"      field="section"     header={header} onChange={onChange} divider />
                <InlineField label="Roll No."     field="rollNo"      header={header} onChange={onChange} />
            </div>

            {/* Row 4: Time | Exam Format | Obtained Marks */}
            <div className="grid grid-cols-3">
                <InlineField label="Time"           field="duration"     header={header} onChange={onChange} divider />
                <InlineField label="Exam Format"    field="type"         header={header} onChange={onChange} divider />
                <InlineField label="Obtained Marks" field="passingMarks" header={header} onChange={onChange} emptyZero />
            </div>
        </div>
    );
}

function InlineField({
    label,
    field,
    header,
    onChange,
    divider = false,
    emptyZero = false,
}: {
    label: string;
    field: keyof GeneratedPaperHeader;
    header: GeneratedPaperHeader;
    onChange: (field: keyof GeneratedPaperHeader, value: string) => void;
    divider?: boolean;
    emptyZero?: boolean;
}) {
    const raw = header[field];
    const displayValue = emptyZero && (raw === 0 || raw === '0')
        ? ''
        : String(raw ?? '');

    return (
        <div
            data-paper-header-divider={divider ? 'r' : undefined}
            className="flex min-w-0 items-center gap-1 overflow-hidden px-2 py-1"
        >
            <span className="shrink-0 font-bold">{label}:</span>
            <input autoComplete="off"
                value={displayValue}
                onChange={(e) => onChange(field, e.target.value)}
                className="min-w-0 flex-1 border-b border-current bg-transparent font-normal outline-none"
            />
        </div>
    );
}
