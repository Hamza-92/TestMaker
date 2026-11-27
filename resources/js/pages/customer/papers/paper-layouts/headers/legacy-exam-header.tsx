import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { RichTextField } from '../questions/rich-text-field';
import type { GeneratedPaperHeader, PaperHeaderTemplate } from '../types';
import { HeaderLogo } from './header-logo';
import {
    formatPaperHeaderDate,
    normalizePaperHeaderDateInput,
} from './paper-header-date';

export type LegacyHeaderTemplate = Extract<
    PaperHeaderTemplate,
    `legacy-${number}`
>;

interface LegacyHeaderProps {
    template: LegacyHeaderTemplate;
    header: GeneratedPaperHeader;
    chapterNumbers: string;
    logoUrl?: string;
    address: string;
    showAddress: boolean;
    schoolNameSize: number;
    addressSize: number;
    onChange: (field: keyof GeneratedPaperHeader, value: string) => void;
    onChapterNumbersChange?: (value: string) => void;
}

type LegacyField =
    | keyof GeneratedPaperHeader
    | 'chapters'
    | 'fatherName'
    | 'paperCode'
    | 'obtainedMarks'
    | 'testNumber'
    | 'examSyllabus'
    | 'unitNumber'
    | 'registrationNumber'
    | 'supervisor';

const LegacyContext = createContext<LegacyHeaderProps | null>(null);

function useLegacy(): LegacyHeaderProps {
    const value = useContext(LegacyContext);

    if (!value) {
        throw new Error('Legacy paper header requires its settings.');
    }

    return value;
}

function SchoolName() {
    const { header, schoolNameSize } = useLegacy();

    return (
        <div
            className="tm-old-school"
            dir="auto"
            style={{ fontSize: schoolNameSize }}
        >
            {header.schoolName}
        </div>
    );
}

function Address() {
    const { address, addressSize, showAddress } = useLegacy();

    if (!showAddress || !address.trim()) {
        return null;
    }

    return (
        <div
            className="tm-old-address"
            dir="auto"
            style={{ fontSize: addressSize }}
        >
            {address}
        </div>
    );
}

function SchoolBlock() {
    return (
        <div className="tm-old-school-block">
            <SchoolName />
            <Address />
        </div>
    );
}

function Logo() {
    const { logoUrl, header } = useLegacy();

    return (
        <div className="tm-old-logo">
            {logoUrl && (
                <HeaderLogo
                    logoUrl={logoUrl}
                    schoolName={header.schoolName}
                    initialSize={60}
                    imageClassName=""
                    fallbackClassName=""
                    square
                />
            )}
        </div>
    );
}

function Field({
    name,
    label,
    ariaLabel = label,
    line = false,
    stacked = false,
}: {
    name: LegacyField;
    label?: string;
    ariaLabel?: string;
    line?: boolean;
    stacked?: boolean;
}) {
    const { header, chapterNumbers, onChange, onChapterNumbersChange } =
        useLegacy();
    const value =
        name === 'chapters'
            ? chapterNumbers
            : name in header
              ? String(header[name as keyof GeneratedPaperHeader] ?? '')
              : '';
    const editable =
        name === 'chapters'
            ? Boolean(onChapterNumbersChange)
            : name === 'date' ||
              name === 'duration' ||
              name === 'exam' ||
              name === 'type';
    const displayValue = name === 'date' ? formatPaperHeaderDate(value) : value;

    return (
        <span
            className={`tm-old-field${line ? 'tm-old-field-line' : ''}${stacked ? 'tm-old-field-stacked' : ''}`}
        >
            {label && <strong className="tm-old-label">{label}</strong>}
            {editable ? (
                <input
                    aria-label={ariaLabel ?? name}
                    autoComplete="off"
                    value={displayValue}
                    onChange={(event) => {
                        const next =
                            name === 'date'
                                ? normalizePaperHeaderDateInput(
                                      event.target.value,
                                  )
                                : event.target.value;

                        if (name === 'chapters') {
                            onChapterNumbersChange?.(next);
                        } else {
                            onChange(name as keyof GeneratedPaperHeader, next);
                        }
                    }}
                />
            ) : name === 'className' || name === 'subject' ? (
                <RichTextField
                    value={value}
                    onChange={() => {}}
                    ariaLabel={ariaLabel ?? name}
                    readOnly
                    className="tm-old-value tm-old-rich-value"
                />
            ) : (
                <span className="tm-old-value" dir="auto">
                    {displayValue || '\u00a0'}
                </span>
            )}
        </span>
    );
}

function Cells({ children }: { children: ReactNode }) {
    return <div className="tm-old-cells">{children}</div>;
}

function ScoreGrid({ kind }: { kind: 'office' | 'subjective' }) {
    const { header } = useLegacy();
    const count = kind === 'office' ? 15 : 12;
    const trailingColumns =
        kind === 'office'
            ? ['Accumulated Marks', 'Rechecking Marks']
            : ['Q. Categories', 'Sub. Marks', 'Obj. Marks', 'Wri. Marks'];

    return (
        <table className="tm-old-score-grid" aria-label="Marks record">
            <tbody>
                {kind === 'subjective' && (
                    <tr>
                        <th colSpan={12}>Subjective Part</th>
                        {trailingColumns.map((column) => (
                            <th key={column} rowSpan={2}>
                                {column}
                            </th>
                        ))}
                    </tr>
                )}
                <tr>
                    {kind === 'office' && <th scope="row">Questions</th>}
                    {Array.from({ length: count }, (_, index) => (
                        <th key={index} scope="col">
                            {index + 1}
                        </th>
                    ))}
                    {kind === 'office' &&
                        trailingColumns.map((column) => (
                            <th key={column} scope="col">
                                {column}
                            </th>
                        ))}
                </tr>
                <tr>
                    {kind === 'office' && <th scope="row">Total Marks</th>}
                    {Array.from({ length: count }, (_, index) => (
                        <td key={index} />
                    ))}
                    {kind === 'office' ? (
                        <>
                            <td>{header.marks}</td>
                            <td>{header.marks}</td>
                        </>
                    ) : (
                        <>
                            <th>T. Marks</th>
                            <td />
                            <td />
                            <td />
                        </>
                    )}
                </tr>
                <tr>
                    {kind === 'office' && <th scope="row">Obtained Marks</th>}
                    {Array.from({ length: count }, (_, index) => (
                        <td key={index} />
                    ))}
                    {kind === 'office' ? (
                        <>
                            <td />
                            <td />
                        </>
                    ) : (
                        <>
                            <th>O. Marks</th>
                            <td />
                            <td />
                            <td />
                        </>
                    )}
                </tr>
                {kind === 'subjective' && (
                    <tr>
                        {Array.from({ length: count }, (_, index) => (
                            <td key={index} />
                        ))}
                        <th>G. Total</th>
                        <td colSpan={3}>{header.marks}</td>
                    </tr>
                )}
            </tbody>
        </table>
    );
}

export function LegacyExamHeader(props: LegacyHeaderProps) {
    const layout = Number(props.template.slice('legacy-'.length));

    return (
        <LegacyContext.Provider value={props}>
            <div
                data-paper-header
                data-paper-legacy-layout={layout}
                className={`tm-old-header tm-old-layout-${layout}`}
            >
                <LegacyLayout layout={layout} />
            </div>
        </LegacyContext.Provider>
    );
}

function LegacyLayout({ layout }: { layout: number }): ReactNode {
    switch (layout) {
        case 0:
            return (
                <div className="tm-old-default">
                    <div className="tm-old-default-logo">
                        <Logo />
                    </div>
                    <div className="tm-old-default-content">
                        <SchoolBlock />
                        <Cells>
                            <Field name="className" label="Class:" />
                            <Field name="subject" label="Subject:" />
                            <Field name="marks" label="Marks:" />
                        </Cells>
                        <Cells>
                            <Field name="studentName" label="Name:" line />
                            <Field name="rollNo" label="Roll No:" line />
                        </Cells>
                        <Cells>
                            <Field name="exam" label="Exam Format:" />
                            <Field name="duration" label="Time:" />
                            <Field name="date" label="Date:" />
                        </Cells>
                        <Field name="chapters" label="Chapters:" />
                    </div>
                </div>
            );
        case 1:
            return (
                <table className="tm-old-table tm-old-one" dir="ltr">
                    <colgroup>
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '7.5%' }} />
                        <col style={{ width: '11.2%' }} />
                        <col style={{ width: '31.1%' }} />
                        <col style={{ width: '7.4%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '6.8%' }} />
                        <col style={{ width: '8%' }} />
                    </colgroup>
                    <tbody>
                        <tr>
                            <td colSpan={9} className="tm-old-dashed">
                                <SchoolBlock />
                            </td>
                        </tr>
                        <tr>
                            <th colSpan={2}>Student Name:</th>
                            <td colSpan={2}>
                                <Field name="studentName" />
                            </td>
                            <td rowSpan={3} className="tm-old-logo-cell">
                                <Logo />
                            </td>
                            <th colSpan={2}>Class:</th>
                            <td colSpan={2}>
                                <Field name="className" ariaLabel="Class" />
                            </td>
                        </tr>
                        <tr>
                            <th colSpan={2}>Father Name</th>
                            <td colSpan={2}>
                                <Field name="fatherName" />
                            </td>
                            <td colSpan={4}>
                                <Field name="chapters" label="CH#:" />
                            </td>
                        </tr>
                        <tr>
                            <th>Time:</th>
                            <td>
                                <Field name="duration" ariaLabel="Time" />
                            </td>
                            <th>Term</th>
                            <td>
                                <Field name="type" ariaLabel="Term" />
                            </td>
                            <th>Subject:</th>
                            <td>
                                <Field name="subject" ariaLabel="Subject" />
                            </td>
                            <th>Marks:</th>
                            <td>
                                <Field name="marks" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        case 2:
            return (
                <div className="tm-old-two">
                    <Logo />
                    <div className="tm-old-two-content">
                        <SchoolBlock />
                        <div className="tm-old-two-summary">
                            <div>
                                <Field name="className" label="Class:" />
                            </div>
                            <div>
                                <Field name="subject" ariaLabel="Subject" />
                            </div>
                            <div>
                                <Field name="marks" label="Maximum Marks:" />
                            </div>
                        </div>
                        <div className="tm-old-two-fields tm-old-two-student">
                            <Field name="studentName" label="Name:" />
                            <Field name="fatherName" label="Father Name:" />
                            <Field name="rollNo" label="Roll No:" />
                            <Field name="section" label="Section:" />
                        </div>
                        <div className="tm-old-two-fields tm-old-two-exam">
                            <Field name="duration" label="Time:" />
                            <Field name="date" label="Date:" />
                            <Field name="type" label="Exam:" />
                            <Field name="chapters" label="Ch:" />
                        </div>
                    </div>
                </div>
            );
        case 3:
            return (
                <table className="tm-old-table tm-old-three">
                    <tbody>
                        <tr>
                            <td className="tm-old-logo-cell">
                                <Logo />
                            </td>
                            <td colSpan={2}>
                                <SchoolBlock />
                            </td>
                            <td className="tm-old-marks-badge">
                                <Field name="marks" label="Maximum Marks:" />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Field name="subject" label="Subject:" />
                            </td>
                            <td>
                                <Field name="className" label="Class:" />
                            </td>
                            <td>
                                <Field name="duration" label="Time:" />
                            </td>
                            <td>
                                <Field name="type" label="Exam:" />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Field name="studentName" label="Name:" line />
                            </td>
                            <td>
                                <Field
                                    name="fatherName"
                                    label="Father Name:"
                                    line
                                />
                            </td>
                            <td>
                                <Field name="rollNo" label="Roll No:" line />
                            </td>
                            <td>
                                <Field name="date" label="Date:" />
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={4}>
                                <Field name="chapters" label="CH#:" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        case 4:
            return (
                <table className="tm-old-table tm-old-four">
                    <tbody>
                        <tr>
                            <td className="tm-old-logo-cell">
                                <Logo />
                            </td>
                            <td colSpan={3}>
                                <SchoolBlock />
                            </td>
                        </tr>
                        <tr>
                            <th>Name:</th>
                            <td>
                                <Field name="studentName" line />
                            </td>
                            <th>Roll No.</th>
                            <td>
                                <Field name="rollNo" line />
                            </td>
                        </tr>
                        <tr>
                            <th>Class:</th>
                            <td>
                                <Field name="className" />
                            </td>
                            <th>Subject:</th>
                            <td>
                                <Field name="subject" />
                            </td>
                        </tr>
                        <tr>
                            <th>Date:</th>
                            <td>
                                <Field name="date" />
                            </td>
                            <th>T.Marks:</th>
                            <td>
                                <Field name="marks" />
                            </td>
                        </tr>
                        <tr>
                            <th>P.Time:</th>
                            <td>
                                <Field name="duration" />
                            </td>
                            <th>CH#:</th>
                            <td>
                                <Field name="chapters" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        case 5:
            return (
                <table className="tm-old-table tm-old-five">
                    <tbody>
                        <tr>
                            <td className="tm-old-logo-cell">
                                <Logo />
                            </td>
                            <td colSpan={3}>
                                <SchoolBlock />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Field name="studentName" label="Name:" line />
                            </td>
                            <td>
                                <Field name="rollNo" label="Roll#:" line />
                            </td>
                            <td>
                                <Field name="className" label="Class:" />
                            </td>
                            <td>
                                <Field name="marks" label="Total marks:" />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Field name="subject" label="Subject:" />
                            </td>
                            <td>
                                <Field name="date" label="Date:" />
                            </td>
                            <td colSpan={2}>
                                <Field name="duration" label="Time:" />
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={4}>
                                <Field name="chapters" label="Syllabus:" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        case 6:
            return (
                <div className="tm-old-six">
                    <table className="tm-old-table">
                        <tbody>
                            <tr>
                                <td className="tm-old-logo-cell">
                                    <Logo />
                                </td>
                                <td>
                                    <SchoolName />
                                </td>
                                <td>
                                    <Field
                                        name="className"
                                        label="Class:"
                                        stacked
                                    />
                                    <Field
                                        name="subject"
                                        label="Subject:"
                                        stacked
                                    />
                                    <Field
                                        name="chapters"
                                        label="CH#:"
                                        stacked
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={3} className="tm-old-office-title">
                                    FOR OFFICE USE ONLY
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <Field
                                        name="fatherName"
                                        label="Rechecked By:"
                                        line
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="supervisor"
                                        label="Invigilator:"
                                        line
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="duration"
                                        label="Time Allowed:"
                                    />
                                    <Field name="marks" label="Total Marks:" />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <Field
                                        name="fatherName"
                                        label="Marked By:"
                                        line
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="supervisor"
                                        label="Teacher's Name:"
                                        line
                                    />
                                </td>
                                <td>
                                    <Field name="date" label="Date:" />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <ScoreGrid kind="office" />
                </div>
            );
        default:
            return <LegacyLayoutLater layout={layout} />;
    }
}

function LegacyLayoutLater({ layout }: { layout: number }): ReactNode {
    switch (layout) {
        case 7:
            return (
                <table className="tm-old-table tm-old-seven">
                    <tbody>
                        <tr>
                            <td className="tm-old-logo-cell">
                                <Logo />
                            </td>
                            <td colSpan={2}>
                                <SchoolName />
                            </td>
                            <td colSpan={2}>
                                <Address />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Field name="testNumber" label="Test#:" line />
                            </td>
                            <td>
                                <Field name="duration" label="Time Allowed:" />
                            </td>
                            <td>
                                <Field name="className" /> –{' '}
                                <Field name="subject" />
                            </td>
                            <td>
                                <Field name="date" label="Date:" />
                            </td>
                            <td>
                                <Field name="marks" label="Total Marks:" />
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2}>
                                <Field name="studentName" label="Name:" line />
                            </td>
                            <td colSpan={2}>
                                <Field name="chapters" label="Chapter#:" />
                            </td>
                            <td>
                                <Field
                                    name="paperCode"
                                    label="Paper Code:"
                                    line
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        case 8:
            return (
                <table className="tm-old-table tm-old-eight">
                    <tbody>
                        <tr>
                            <td rowSpan={4} className="tm-old-logo-cell">
                                <Logo />
                            </td>
                            <td colSpan={3}>
                                <SchoolBlock />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Field name="className" label="Class:" />
                            </td>
                            <td>
                                <Field name="subject" label="Subject:" />{' '}
                                <Field name="chapters" label="CH#:" />
                            </td>
                            <td>
                                <Field name="marks" label="Maximum Marks:" />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Field
                                    name="studentName"
                                    label="Student Name:"
                                    line
                                />
                            </td>
                            <td>
                                <Field name="section" label="Section:" line />
                            </td>
                            <td>
                                <Field name="rollNo" label="Roll No.:" line />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Field name="duration" label="Time:" />
                            </td>
                            <td>
                                <Field name="type" label="Exam Format:" />
                            </td>
                            <td>
                                <Field
                                    name="obtainedMarks"
                                    label="Obtained Marks:"
                                    line
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        case 9:
            return (
                <table className="tm-old-table tm-old-nine">
                    <tbody>
                        <tr>
                            <td rowSpan={3} className="tm-old-logo-cell">
                                <Logo />
                            </td>
                            <td
                                colSpan={4}
                                rowSpan={3}
                                className="tm-old-underlined-school"
                            >
                                <SchoolBlock />
                            </td>
                            <td colSpan={2}>
                                <Field name="type" label="Exam:" />
                            </td>
                        </tr>
                        <tr>
                            <th>Total Marks</th>
                            <th>Obtained Marks</th>
                        </tr>
                        <tr>
                            <td>
                                <Field name="marks" />
                            </td>
                            <td>
                                <Field name="obtainedMarks" line />
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2}>
                                <Field
                                    name="studentName"
                                    label="Student Name:"
                                    line
                                />
                            </td>
                            <td colSpan={2}>
                                <Field
                                    name="fatherName"
                                    label="Father Name:"
                                    line
                                />
                            </td>
                            <td>
                                <Field name="className" label="Class:" />
                            </td>
                            <td colSpan={2}>
                                <Field name="subject" label="Subject:" />{' '}
                                <Field name="chapters" label="CH#:" />
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={7}>
                                <Cells>
                                    <Field name="duration" label="Time:" />
                                    <Field name="date" label="Date:" />
                                    <Field
                                        name="rollNo"
                                        label="Roll No.:"
                                        line
                                    />
                                </Cells>
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        case 10:
            return (
                <table className="tm-old-table tm-old-ten">
                    <tbody>
                        <tr>
                            <td rowSpan={4} className="tm-old-logo-cell">
                                <Logo />
                            </td>
                            <td>
                                <SchoolName />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Address />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Cells>
                                    <Field name="className" />
                                    <Field name="subject" />
                                    <Field name="type" />
                                </Cells>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Cells>
                                    <Field name="marks" label="Total Marks:" />
                                    <Field name="chapters" label="CH#:" />
                                </Cells>
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        case 11:
            return (
                <table className="tm-old-table tm-old-eleven">
                    <tbody>
                        <tr>
                            <td className="tm-old-logo-cell">
                                <Logo />
                            </td>
                            <td colSpan={4}>
                                <SchoolName />
                            </td>
                            <td>
                                <Field name="type" label="Exam:" />
                            </td>
                        </tr>
                        <tr>
                            <th>Class/Subject:</th>
                            <td colSpan={2}>
                                <Field name="className" /> /{' '}
                                <Field name="subject" />
                            </td>
                            <th>CH#:</th>
                            <td>
                                <Field name="chapters" />
                            </td>
                            <td>
                                <Field name="duration" label="Time Allowed:" />
                            </td>
                        </tr>
                        <tr>
                            <th>Roll No.:</th>
                            <td>
                                <Field name="rollNo" line />
                            </td>
                            <th>Section:</th>
                            <td>
                                <Field name="section" line />
                            </td>
                            <th>Max. Marks:</th>
                            <td>
                                <Field name="marks" />
                            </td>
                        </tr>
                        <tr>
                            <th>Student Name:</th>
                            <td colSpan={3}>
                                <Field name="studentName" line />
                            </td>
                            <th>Date:</th>
                            <td>
                                <Field name="date" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        case 12:
            return (
                <div className="tm-old-twelve">
                    <table className="tm-old-table tm-old-no-lines">
                        <tbody>
                            <tr>
                                <td className="tm-old-left-school">
                                    <SchoolName />
                                </td>
                                <td className="tm-old-address-highlight">
                                    <Address />
                                </td>
                                <td className="tm-old-logo-cell">
                                    <Logo />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <table className="tm-old-table tm-old-floating-table">
                        <tbody>
                            <tr>
                                <td>
                                    <Field
                                        name="studentName"
                                        label="Student Name"
                                        line
                                        stacked
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="rollNo"
                                        label="Roll Number"
                                        line
                                        stacked
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="className"
                                        label="Class Name"
                                        line
                                        stacked
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="paperCode"
                                        label="Paper Code"
                                        line
                                        stacked
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <Field
                                        name="subject"
                                        label="Subject Name"
                                        line
                                        stacked
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="duration"
                                        label="Time Allowed"
                                        line
                                        stacked
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="marks"
                                        label="Total Marks"
                                        line
                                        stacked
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="date"
                                        label="Exam Date"
                                        line
                                        stacked
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={3}>
                                    <Field
                                        name="examSyllabus"
                                        label="Exam Syllabus"
                                        line
                                        stacked
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="chapters"
                                        label="Chapter #"
                                        line
                                        stacked
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            );
        default:
            return <LegacyLayoutFinal layout={layout} />;
    }
}

function LegacyLayoutFinal({ layout }: { layout: number }): ReactNode {
    switch (layout) {
        case 13:
            return (
                <table className="tm-old-table tm-old-thirteen">
                    <tbody>
                        <tr>
                            <td className="tm-old-logo-cell">
                                <Logo />
                            </td>
                            <td colSpan={4} className="tm-old-school-left">
                                <SchoolName />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Field name="duration" label="TIME:" />
                            </td>
                            <td colSpan={2} className="tm-old-subject-badge">
                                <Field name="subject" />{' '}
                                <Field name="chapters" label="CH #:" />
                            </td>
                            <td>
                                <Field name="date" label="DATE:" />
                            </td>
                            <td>
                                <Field name="className" label="CLASS:" />
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2}>
                                <Field name="studentName" label="NAME:" line />
                            </td>
                            <td>
                                <Field name="section" label="SECTION:" line />
                            </td>
                            <td>
                                <Field name="paperCode" label="COMP.#:" line />
                            </td>
                            <td>
                                <Field name="marks" label="T.M:" />{' '}
                                <Field name="obtainedMarks" label="O.M:" line />
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        case 14:
            return (
                <table className="tm-old-table tm-old-fourteen">
                    <tbody>
                        <tr>
                            <td rowSpan={5} className="tm-old-logo-cell">
                                <Logo />
                            </td>
                            <th>EXAM</th>
                            <td>
                                <Field name="exam" />
                            </td>
                            <th>TYPE</th>
                            <td>
                                <Field name="type" />
                            </td>
                        </tr>
                        <tr>
                            <th>CLASS</th>
                            <td>
                                <Field name="className" /> –{' '}
                                <Field name="subject" />
                            </td>
                            <th>DATE</th>
                            <td>
                                <Field name="date" />
                            </td>
                        </tr>
                        <tr>
                            <th>SECTION</th>
                            <td>
                                <Field name="section" line />
                            </td>
                            <th>DURATION</th>
                            <td>
                                <Field name="duration" />
                            </td>
                        </tr>
                        <tr>
                            <th>Chapter</th>
                            <td>
                                <Field name="chapters" />
                            </td>
                            <th>MARKS</th>
                            <td>
                                <Field name="marks" />
                            </td>
                        </tr>
                        <tr>
                            <th>NAME</th>
                            <td>
                                <Field name="studentName" line />
                            </td>
                            <th>ROLL NO</th>
                            <td>
                                <Field name="rollNo" line />
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        case 15:
            return (
                <div className="tm-old-fifteen">
                    <div className="tm-old-fifteen-school">
                        <SchoolBlock />
                    </div>
                    <table className="tm-old-table tm-old-floating-table">
                        <tbody>
                            <tr>
                                <td rowSpan={3} className="tm-old-logo-cell">
                                    <Logo />
                                </td>
                                <td>
                                    <Field
                                        name="studentName"
                                        label="Student Name"
                                        line
                                        stacked
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="rollNo"
                                        label="Roll Number"
                                        line
                                        stacked
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="className"
                                        label="Class Name"
                                        line
                                        stacked
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="paperCode"
                                        label="Paper Code"
                                        line
                                        stacked
                                    />
                                </td>
                                <td rowSpan={3} className="tm-old-logo-cell">
                                    <Logo />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <Field
                                        name="subject"
                                        label="Subject Name"
                                        line
                                        stacked
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="duration"
                                        label="Time Allowed"
                                        line
                                        stacked
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="marks"
                                        label="Total Marks"
                                        line
                                        stacked
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="date"
                                        label="Exam Date"
                                        line
                                        stacked
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={3}>
                                    <Field
                                        name="examSyllabus"
                                        label="Exam Syllabus"
                                        line
                                        stacked
                                    />
                                </td>
                                <td>
                                    <Field
                                        name="chapters"
                                        label="Chapter"
                                        line
                                        stacked
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            );
        case 16:
            return (
                <table className="tm-old-table tm-old-sixteen">
                    <tbody>
                        <tr>
                            <td rowSpan={4} className="tm-old-logo-cell">
                                <Logo />
                            </td>
                            <td colSpan={2} rowSpan={2}>
                                <SchoolName />
                            </td>
                            <td>
                                <Field name="className" label="Class:" />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Field name="marks" label="Total Marks:" />
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2}>
                                <Address />
                            </td>
                            <td>
                                <Field name="subject" label="Subject:" />{' '}
                                <Field name="chapters" label="CH#:" />
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2}>
                                <Field name="studentName" label="Name:" line />
                            </td>
                            <td>
                                <Field name="rollNo" label="Roll No.:" line />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Field name="unitNumber" label="Unit#:" line />
                            </td>
                            <td colSpan={2}>
                                <Field name="testNumber" label="Test#:" line />
                            </td>
                            <td>
                                <Field name="date" label="Date:" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        case 17:
            return (
                <div className="tm-old-seventeen">
                    <table className="tm-old-table tm-old-no-lines">
                        <tbody>
                            <tr>
                                <td className="tm-old-logo-cell">
                                    <Logo />
                                </td>
                                <td colSpan={3}>
                                    <SchoolName />
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={4} className="tm-old-centered">
                                    <Field name="type" />{' '}
                                    <Field name="chapters" label="CH#:" />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <Field name="subject" label="Subject:" />
                                </td>
                                <td>
                                    <Field name="duration" label="Time:" />
                                </td>
                                <td>
                                    <Field name="marks" label="Total Marks:" />
                                </td>
                                <td>
                                    <Field name="date" label="Date:" />
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={2}>
                                    <Field
                                        name="studentName"
                                        label="Student Name:"
                                        line
                                    />
                                </td>
                                <td colSpan={2}>
                                    <Field
                                        name="fatherName"
                                        label="Father's Name:"
                                        line
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <Field name="className" label="Class:" />
                                </td>
                                <td>
                                    <Field
                                        name="section"
                                        label="Section:"
                                        line
                                    />
                                </td>
                                <td colSpan={2}>
                                    <Field
                                        name="registrationNumber"
                                        label="Reg. No.:"
                                        line
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <ScoreGrid kind="subjective" />
                    <Cells>
                        <Field
                            name="supervisor"
                            label="Supervisor's Name:"
                            line
                        />
                        <Field
                            name="obtainedMarks"
                            label="Checking Marks:"
                            line
                        />
                        <Field
                            name="obtainedMarks"
                            label="Rechecking Marks:"
                            line
                        />
                    </Cells>
                </div>
            );
        case 18:
            return (
                <table className="tm-old-table tm-old-eighteen">
                    <tbody>
                        <tr>
                            <td rowSpan={4} className="tm-old-logo-cell">
                                <Logo />
                            </td>
                            <td colSpan={4}>
                                <div className="tm-old-rounded">
                                    <SchoolName />
                                </div>
                                <Address />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Field name="studentName" label="Name:" line />
                            </td>
                            <td>
                                <Field
                                    name="fatherName"
                                    label="Father Name:"
                                    line
                                />
                            </td>
                            <td>
                                <Field name="rollNo" label="Roll No:" line />
                            </td>
                            <td>
                                <Field name="section" label="Section:" line />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Field name="className" label="Class:" line />
                            </td>
                            <td>
                                <Field name="subject" label="Subject:" line />
                            </td>
                            <td>
                                <Field name="marks" label="Total Marks:" line />
                            </td>
                            <td>
                                <Field name="duration" label="Time:" line />
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={4}>
                                <Field name="chapters" label="CH#:" line />
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        default:
            return null;
    }
}
