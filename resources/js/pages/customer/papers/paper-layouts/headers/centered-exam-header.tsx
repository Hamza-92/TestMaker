import { RichTextField } from '../questions/rich-text-field';
import type { GeneratedPaperHeader } from '../types';
import { HeaderLogo } from './header-logo';

interface CenteredExamHeaderProps {
    header: GeneratedPaperHeader;
    logoUrl?: string;
    address?: string;
    showAddress?: boolean;
    onChange: (field: keyof GeneratedPaperHeader, value: string) => void;
    paddingX: number;
    paddingY: number;
}

export function CenteredExamHeader({
    header,
    logoUrl,
    address,
    showAddress,
    onChange,
    paddingX,
    paddingY,
}: CenteredExamHeaderProps) {
    return (
        <div
            data-paper-header
            data-paper-header-padding-x={paddingX}
            data-paper-header-padding-y={paddingY}
        >
            {/* Top: logo + school name + subtitle — no outer border */}
            <div className="flex flex-col items-center py-2 text-center">
                <HeaderLogo
                    logoUrl={logoUrl}
                    schoolName={header.schoolName}
                    initialSize={64}
                    imageClassName="mb-1"
                    fallbackClassName="mb-1 flex size-14 items-center justify-center rounded-full border-2 border-current text-lg font-bold leading-none"
                />
                <input
                    autoComplete="off"
                    value={header.schoolName}
                    onChange={(e) => onChange('schoolName', e.target.value)}
                    className="w-full bg-transparent text-center text-xl font-bold uppercase outline-none print:font-extrabold"
                    placeholder="School Name"
                />
                {showAddress && address && (
                    <p className="w-full text-center text-sm">{address}</p>
                )}
            </div>

            {/* Bordered table section */}
            <div data-paper-header-frame>
                {/* Black bar: Subject | Class | Max Marks */}
                <div
                    data-paper-header-divider="b"
                    className="grid grid-cols-3 bg-slate-950 text-white [-webkit-print-color-adjust:exact] [print-color-adjust:exact]"
                >
                    <div
                        data-paper-header-divider="r"
                        className="flex items-center gap-1 px-3 py-1.5"
                    >
                        <span className="shrink-0 font-bold">Subject:</span>
                        <RichTextField
                            value={header.subject}
                            onChange={(value) => onChange('subject', value)}
                            className="min-w-0 flex-1 font-normal text-white"
                            placeholder="Subject"
                        />
                    </div>
                    <div
                        data-paper-header-divider="r"
                        className="flex items-center justify-center gap-1 px-3 py-1.5"
                    >
                        <span className="shrink-0 font-bold">Class:</span>
                        <RichTextField
                            value={header.className}
                            onChange={(value) => onChange('className', value)}
                            className="min-w-0 flex-1 font-normal text-white"
                            placeholder="Class"
                        />
                    </div>
                    <div className="flex items-center justify-end gap-1 px-3 py-1.5">
                        <span className="shrink-0 font-bold">Marks:</span>
                        <input
                            autoComplete="off"
                            value={String(header.marks ?? '')}
                            onChange={(e) => onChange('marks', e.target.value)}
                            className="w-10 min-w-0 bg-transparent text-center font-normal text-white outline-none"
                        />
                    </div>
                </div>

                {/* Row 2: Name | Section | Roll No */}
                <div
                    data-paper-header-divider="b"
                    className="flex items-center gap-4 px-3 py-1"
                >
                    <UnderlineField
                        label="Name"
                        field="studentName"
                        header={header}
                        onChange={onChange}
                        className="flex-1"
                    />
                    <UnderlineField
                        label="Section"
                        field="section"
                        header={header}
                        onChange={onChange}
                        className="w-28"
                    />
                    <UnderlineField
                        label="Roll No"
                        field="rollNo"
                        header={header}
                        onChange={onChange}
                        className="w-28"
                    />
                </div>

                {/* Row 3: Duration | Type | Date */}
                <div className="flex items-center gap-4 px-3 py-1">
                    <UnderlineField
                        label="Time"
                        field="duration"
                        header={header}
                        onChange={onChange}
                        className="w-32"
                    />
                    <UnderlineField
                        label="Exam"
                        field="type"
                        header={header}
                        onChange={onChange}
                        className="flex-1"
                    />
                    <UnderlineField
                        label="Date"
                        field="date"
                        header={header}
                        onChange={onChange}
                        className="w-32"
                    />
                </div>
            </div>
        </div>
    );
}

function UnderlineField({
    label,
    field,
    header,
    onChange,
    className = '',
}: {
    label: string;
    field: keyof GeneratedPaperHeader;
    header: GeneratedPaperHeader;
    onChange: (field: keyof GeneratedPaperHeader, value: string) => void;
    className?: string;
}) {
    return (
        <div className={`flex items-center gap-1 ${className}`}>
            <span className="shrink-0 font-bold">{label}:</span>
            <input
                autoComplete="off"
                value={String(header[field] ?? '')}
                onChange={(e) => onChange(field, e.target.value)}
                className="min-w-0 flex-1 border-b border-current bg-transparent font-normal outline-none"
            />
        </div>
    );
}
