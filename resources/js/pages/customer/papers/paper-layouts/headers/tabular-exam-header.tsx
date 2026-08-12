import { RichTextField } from '../questions/rich-text-field';
import type { GeneratedPaperHeader } from '../types';
import { HeaderLogo } from './header-logo';

interface TabularExamHeaderProps {
    header: GeneratedPaperHeader;
    logoUrl?: string;
    address?: string;
    showAddress?: boolean;
    onChange: (field: keyof GeneratedPaperHeader, value: string) => void;
    paddingX: number;
    paddingY: number;
}

export function TabularExamHeader({
    header,
    logoUrl,
    address,
    showAddress,
    onChange,
    paddingX,
    paddingY,
}: TabularExamHeaderProps) {
    return (
        <div
            data-paper-header-frame
            data-paper-header
            data-paper-header-padding-x={paddingX}
            data-paper-header-padding-y={paddingY}
            className="grid grid-cols-[5rem_1fr]"
        >
            {/* Logo — spans all 4 rows on the right */}
            <div
                data-paper-header-cell
                data-paper-header-divider="r"
                className="row-span-4 flex items-center justify-center p-2"
            >
                <HeaderLogo
                    logoUrl={logoUrl}
                    schoolName={header.schoolName}
                    initialSize={60}
                    imageClassName=""
                    fallbackClassName="flex size-14 items-center justify-center rounded-full border-2 border-current text-lg font-bold leading-none"
                />
            </div>

            {/* Row 1: School name + address — centered */}
            <div
                data-paper-header-divider="b"
                className="flex flex-col items-center justify-center py-1.5 text-center"
            >
                <input
                    autoComplete="off"
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
            <div data-paper-header-divider="b" className="grid grid-cols-3">
                <InlineField
                    label="Class"
                    field="className"
                    header={header}
                    onChange={onChange}
                    divider
                />
                <InlineField
                    label="Subject"
                    field="subject"
                    header={header}
                    onChange={onChange}
                    divider
                />
                <InlineField
                    label="Marks"
                    field="marks"
                    header={header}
                    onChange={onChange}
                />
            </div>

            {/* Row 3: Student Name | Section | Roll No */}
            <div data-paper-header-divider="b" className="grid grid-cols-3">
                <InlineField
                    label="Student Name"
                    field="studentName"
                    header={header}
                    onChange={onChange}
                    divider
                />
                <InlineField
                    label="Section"
                    field="section"
                    header={header}
                    onChange={onChange}
                    divider
                />
                <InlineField
                    label="Roll No."
                    field="rollNo"
                    header={header}
                    onChange={onChange}
                />
            </div>

            {/* Row 4: Time | Exam Format | Obtained Marks */}
            <div className="grid grid-cols-3">
                <InlineField
                    label="Time"
                    field="duration"
                    header={header}
                    onChange={onChange}
                    divider
                />
                <InlineField
                    label="Exam Format"
                    field="type"
                    header={header}
                    onChange={onChange}
                    divider
                />
                <InlineField
                    label="Obtained Marks"
                    field="passingMarks"
                    header={header}
                    onChange={onChange}
                    emptyZero
                />
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
    const displayValue =
        emptyZero && (raw === 0 || raw === '0') ? '' : String(raw ?? '');

    return (
        <div
            data-paper-header-divider={divider ? 'r' : undefined}
            className="flex min-w-0 items-center gap-1 overflow-hidden px-2 py-1"
        >
            <span className="shrink-0 font-bold">{label}:</span>
            {field === 'className' || field === 'subject' ? (
                <RichTextField
                    value={displayValue}
                    onChange={(value) => onChange(field, value)}
                    ariaLabel={label}
                    className="min-w-0 flex-1 border-b border-current font-normal"
                />
            ) : (
                <input
                    autoComplete="off"
                    value={displayValue}
                    onChange={(e) => onChange(field, e.target.value)}
                    className="min-w-0 flex-1 border-b border-current bg-transparent font-normal outline-none"
                />
            )}
        </div>
    );
}
