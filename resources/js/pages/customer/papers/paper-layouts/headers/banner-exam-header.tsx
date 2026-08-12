import { RichTextField } from '../questions/rich-text-field';
import type { GeneratedPaperHeader } from '../types';
import { HeaderLogo } from './header-logo';

interface BannerExamHeaderProps {
    header: GeneratedPaperHeader;
    logoUrl?: string;
    paddingX: number;
    paddingY: number;
    onChange: (field: keyof GeneratedPaperHeader, value: string) => void;
}

export function BannerExamHeader({
    header,
    logoUrl,
    paddingX,
    paddingY,
    onChange,
}: BannerExamHeaderProps) {
    return (
        <div
            data-paper-header-frame
            data-paper-header
            data-paper-header-padding-x={paddingX}
            data-paper-header-padding-y={paddingY}
        >
            {/* Top: initials circle (left) + school name centered (flex-1) */}
            <div
                data-paper-header-divider="b"
                className="flex items-center gap-3 px-4 py-2"
            >
                <HeaderLogo
                    logoUrl={logoUrl}
                    schoolName={header.schoolName}
                    initialSize={56}
                    imageClassName="shrink-0"
                    fallbackClassName="flex items-center justify-center rounded-full border-2 border-current text-center text-lg leading-none font-bold"
                />
                <div className="flex-1 text-center">
                    <input
                        autoComplete="off"
                        value={header.schoolName}
                        onChange={(e) => onChange('schoolName', e.target.value)}
                        className="w-full bg-transparent text-center text-xl font-bold uppercase outline-none print:font-extrabold"
                        placeholder="School Name"
                    />
                    <input
                        autoComplete="off"
                        value={header.exam}
                        onChange={(e) => onChange('exam', e.target.value)}
                        className="w-full bg-transparent text-center text-sm font-normal text-slate-500 outline-none"
                        placeholder="Exam / Year"
                    />
                </div>
            </div>

            {/* Row 1: Class | Subject (centered, no underline) | Max Marks — equal thirds */}
            <div data-paper-header-divider="b" className="grid grid-cols-3">
                <InlineField
                    label="Class"
                    field="className"
                    header={header}
                    onChange={onChange}
                    divider
                />
                <div
                    data-paper-header-divider="r"
                    className="flex items-center justify-center px-3 py-1.5"
                >
                    <RichTextField
                        value={header.subject}
                        onChange={(value) => onChange('subject', value)}
                        className="w-full text-center font-normal"
                        placeholder="Subject"
                    />
                </div>
                <InlineField
                    label="Marks"
                    field="marks"
                    header={header}
                    onChange={onChange}
                />
            </div>

            {/* Row 2: Name | Roll No | Section — equal thirds */}
            <div data-paper-header-divider="b" className="grid grid-cols-3">
                <InlineField
                    label="Name"
                    field="studentName"
                    header={header}
                    onChange={onChange}
                    divider
                />
                <InlineField
                    label="Roll No"
                    field="rollNo"
                    header={header}
                    onChange={onChange}
                    divider
                />
                <InlineField
                    label="Section"
                    field="section"
                    header={header}
                    onChange={onChange}
                />
            </div>

            {/* Row 3: Time | Date | Exam — equal thirds */}
            <div className="grid grid-cols-3">
                <InlineField
                    label="Time"
                    field="duration"
                    header={header}
                    onChange={onChange}
                    divider
                />
                <InlineField
                    label="Date"
                    field="date"
                    header={header}
                    onChange={onChange}
                    divider
                />
                <InlineField
                    label="Exam"
                    field="type"
                    header={header}
                    onChange={onChange}
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
            className="flex items-center gap-1 overflow-hidden px-3 py-1.5"
        >
            <span className="shrink-0 font-bold">{label}:</span>
            {field === 'className' || field === 'subject' ? (
                <RichTextField
                    value={String(header[field] ?? '')}
                    onChange={(value) => onChange(field, value)}
                    ariaLabel={label}
                    className="min-w-0 flex-1 border-b border-current font-normal"
                />
            ) : (
                <input
                    autoComplete="off"
                    value={String(header[field] ?? '')}
                    onChange={(e) => onChange(field, e.target.value)}
                    className="min-w-0 flex-1 border-b border-current bg-transparent font-normal outline-none"
                />
            )}
        </div>
    );
}
