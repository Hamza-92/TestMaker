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
            data-paper-header-table-frame
            data-paper-header
            data-paper-header-padding-x={paddingX}
            data-paper-header-padding-y={paddingY}
        >
            <table data-paper-header-table>
                <colgroup>
                    <col className="w-48" />
                    <col className="w-28" />
                    <col />
                    <col className="w-28" />
                    <col />
                </colgroup>
                <tbody>
                    {leftFields.map(([leftField, leftLabel], index) => {
                        const [rightField, rightLabel] = rightFields[index];

                        return (
                            <tr key={leftField}>
                                {index === 0 && (
                                    <td
                                        rowSpan={leftFields.length}
                                        data-paper-header-cell
                                        className="p-3 align-middle"
                                    >
                                        <div className="flex items-center justify-center">
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
                                    </td>
                                )}

                                <th
                                    scope="row"
                                    data-paper-header-label-cell
                                    className="bg-slate-100 px-2 py-1 text-left text-sm font-bold uppercase"
                                >
                                    {leftLabel}
                                </th>
                                <HeaderValueCell
                                    field={leftField}
                                    label={leftLabel}
                                    header={header}
                                    onChange={onChange}
                                />

                                <th
                                    scope="row"
                                    data-paper-header-label-cell
                                    className="bg-slate-100 px-2 py-1 text-left text-sm font-bold uppercase"
                                >
                                    {rightLabel}
                                </th>
                                <HeaderValueCell
                                    field={rightField}
                                    label={rightLabel}
                                    header={header}
                                    onChange={onChange}
                                />
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function HeaderValueCell({
    field,
    label,
    header,
    onChange,
}: {
    field: keyof GeneratedPaperHeader;
    label: string;
    header: GeneratedPaperHeader;
    onChange: (field: keyof GeneratedPaperHeader, value: string) => void;
}) {
    return (
        <td className="p-0 align-middle">
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
                    onChange={(event) => onChange(field, event.target.value)}
                    className="h-full w-full min-w-0 bg-transparent px-2 py-1 text-sm font-normal outline-none"
                />
            )}
        </td>
    );
}
