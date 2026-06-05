import type { GeneratedPaperHeader } from '../types';

interface ClassicExamHeaderProps {
    header: GeneratedPaperHeader;
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
    onChange,
}: ClassicExamHeaderProps) {
    return (
        <div className="border-2 border-black text-black">
            <div className="grid min-h-36 grid-cols-[12rem_1fr_1fr]">
                <div className="flex items-center justify-center border-r-2 border-black p-3">
                    <div className="flex size-28 items-center justify-center rounded-full border-2 border-black text-center text-3xl leading-none font-bold">
                        {header.schoolName
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((word) => word[0])
                            .join('')
                            .toUpperCase() || 'TM'}
                    </div>
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
        <div className="grid grid-rows-5 border-r border-black last:border-r-0">
            {fields.map(([field, label]) => (
                <div
                    key={field}
                    className="grid grid-cols-[7rem_1fr] border-b border-black last:border-b-0"
                >
                    <div className="border-r border-black bg-slate-100 px-2 py-1 text-sm font-bold uppercase">
                        {label}
                    </div>
                    <input
                        value={String(header[field] ?? '')}
                        onChange={(event) =>
                            onChange(field, event.target.value)
                        }
                        className="h-full min-w-0 bg-transparent px-2 py-1 text-sm font-semibold outline-none print:font-bold"
                    />
                </div>
            ))}
        </div>
    );
}
