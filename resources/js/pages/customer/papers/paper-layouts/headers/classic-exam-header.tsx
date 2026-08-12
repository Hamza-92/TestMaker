import { RichTextField } from '../questions/rich-text-field';
import type { GeneratedPaperHeader } from '../types';
import { HeaderLogo } from './header-logo';

interface ClassicExamHeaderProps {
    header: GeneratedPaperHeader;
    logoUrl?: string;
    paddingX: number;
    paddingY: number;
    onChange: (field: keyof GeneratedPaperHeader, value: string) => void;
}

const leftFields: Array<[keyof GeneratedPaperHeader, string]> = [
    ['exam', 'Exam'],
    ['className', 'Class'],
    ['section', 'Section'],
    ['subject', 'Subject'],
    ['studentName', 'Name'],
];

const rightFields: Array<[keyof GeneratedPaperHeader, string]> = [
    ['type', 'Type'],
    ['date', 'Date'],
    ['duration', 'Duration'],
    ['marks', 'Marks'],
    ['rollNo', 'Roll No'],
];

export function ClassicExamHeader({
    header,
    logoUrl,
    paddingX,
    paddingY,
    onChange,
}: ClassicExamHeaderProps) {
    return (
        <div
            data-paper-header-frame
            data-paper-header
            data-paper-header-padding-x={paddingX}
            data-paper-header-padding-y={paddingY}
        >
            <div className="grid grid-cols-[12rem_1fr_1fr]">
                <div
                    data-paper-header-cell
                    data-paper-header-divider="r"
                    className="flex items-center justify-center p-3"
                >
                    {/* Initials circle keeps its own decorative 2px outline so
                        it doesn't disappear when the user sets header border to 0. */}
                    <HeaderLogo
                        logoUrl={logoUrl}
                        schoolName={header.schoolName}
                        initialSize={112}
                        imageClassName=""
                        fallbackClassName="flex size-28 items-center justify-center rounded-full border-2 border-current text-center text-3xl leading-none font-bold"
                    />
                </div>

                <HeaderColumn
                    fields={leftFields}
                    header={header}
                    onChange={onChange}
                />
                <HeaderColumn
                    fields={rightFields}
                    header={header}
                    onChange={onChange}
                />
            </div>
        </div>
    );
}

function HeaderColumn({
    fields,
    header,
    onChange,
}: {
    fields: Array<[keyof GeneratedPaperHeader, string]>;
    header: GeneratedPaperHeader;
    onChange: (field: keyof GeneratedPaperHeader, value: string) => void;
}) {
    return (
        <div
            data-paper-header
            data-paper-header-divider="r"
            className="grid grid-rows-5"
        >
            {fields.map(([field, label]) => (
                <div
                    key={field}
                    data-paper-header-divider="b"
                    className="grid grid-cols-[7rem_1fr]"
                >
                    <div
                        data-paper-header-divider="r"
                        className="bg-slate-100 px-2 py-1 text-sm font-bold uppercase"
                    >
                        {label}
                    </div>
                    {field === 'className' || field === 'subject' ? (
                        <RichTextField
                            value={String(header[field] ?? '')}
                            onChange={(value) => onChange(field, value)}
                            ariaLabel={label}
                            className="h-full min-w-0 px-2 py-1 text-sm font-normal"
                        />
                    ) : (
                        <input
                            autoComplete="off"
                            value={String(header[field] ?? '')}
                            onChange={(event) =>
                                onChange(field, event.target.value)
                            }
                            className="h-full min-w-0 bg-transparent px-2 py-1 text-sm font-normal outline-none"
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
