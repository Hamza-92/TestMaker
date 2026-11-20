import {
    ArrowLeftIcon,
    DownloadIcon,
    Loader2Icon,
    PrinterIcon,
} from 'lucide-react';
import { create as createQRCode } from 'qrcode';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { toast } from 'sonner';
import type { GeneratedPaper } from '../types';
import { formatQuestionLabel, objectiveSectionQuestionCount } from '../types';
import { buildAnswerSpacePages } from './answer-space-pages';
import type { AnswerSpacePage } from './answer-space-pages';
import './e-sheet.css';

const DIGIT_PATTERNS = [
    'nnwwn',
    'wnnnw',
    'nwnnw',
    'wwnnn',
    'nnwnw',
    'wnwnn',
    'nwwnn',
    'nnnww',
    'wnnwn',
    'nwnwn',
];

function box(
    x: number,
    y: number,
    width?: number,
    height?: number,
): CSSProperties {
    return {
        position: 'absolute',
        left: `${x}mm`,
        top: `${y}mm`,
        ...(width === undefined ? {} : { width: `${width}mm` }),
        ...(height === undefined ? {} : { height: `${height}mm` }),
    };
}

function pageSerial(paper: GeneratedPaper, setIndex: number): string {
    let hash = 0;

    for (const character of `${paper.id}:set:${setIndex}`) {
        hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
    }

    return String(hash % 100000000).padStart(8, '0');
}

function Barcode({ value }: { value: string }) {
    const bars = useMemo(() => {
        const digits = value.length % 2 ? `0${value}` : value;
        const rectangles: Array<{ x: number; width: number }> = [];
        let x = 0;
        const add = (width: number, dark: boolean) => {
            if (dark) {
                rectangles.push({ x, width });
            }

            x += width;
        };
        // Interleaved 2 of 5: narrow start, wide/narrow digit pairs, stop.
        [true, false, true, false].forEach((dark) => add(1, dark));

        for (let index = 0; index < digits.length; index += 2) {
            const barsPattern = DIGIT_PATTERNS[Number(digits[index])];
            const spacesPattern = DIGIT_PATTERNS[Number(digits[index + 1])];

            for (let offset = 0; offset < 5; offset++) {
                add(barsPattern[offset] === 'w' ? 2.5 : 1, true);
                add(spacesPattern[offset] === 'w' ? 2.5 : 1, false);
            }
        }

        add(2.5, true);
        add(1, false);
        add(1, true);

        return { rectangles, width: x };
    }, [value]);

    return (
        <svg
            aria-label={`Barcode ${value}`}
            viewBox={`-8 0 ${bars.width + 16} 30`}
            preserveAspectRatio="none"
        >
            {bars.rectangles.map((bar, index) => (
                <rect
                    key={index}
                    x={bar.x}
                    y="0"
                    width={bar.width}
                    height="30"
                    fill="black"
                />
            ))}
        </svg>
    );
}

function QrMark({ value }: { value: string }) {
    const matrix = useMemo(
        () => createQRCode(value, { errorCorrectionLevel: 'M' }).modules,
        [value],
    );
    const dark = [];

    for (let row = 0; row < matrix.size; row++) {
        for (let col = 0; col < matrix.size; col++) {
            if (matrix.get(row, col)) {
                dark.push(
                    <rect
                        key={`${row}-${col}`}
                        x={col}
                        y={row}
                        width="1"
                        height="1"
                    />,
                );
            }
        }
    }

    return (
        <svg
            aria-label={`QR code ${value}`}
            viewBox={`-2 -2 ${matrix.size + 4} ${matrix.size + 4}`}
            shapeRendering="crispEdges"
        >
            <g fill="black">{dark}</g>
        </svg>
    );
}

function PageMarks({ number, serial }: { number: number; serial: string }) {
    const page = String(number).padStart(2, '0');

    return (
        <>
            <div className="e-sheet-cross" style={box(19, 9)}>
                +
            </div>
            <div className="e-sheet-cross" style={box(197, 9)}>
                +
            </div>
            <div className="e-sheet-cross" style={box(19, 284)}>
                +
            </div>
            <div className="e-sheet-cross" style={box(197, 284)}>
                +
            </div>
            <div className="e-sheet-qr" style={box(26, 17, 15, 15)}>
                <QrMark value={`TestMaker:${serial}:page:${page}`} />
                <span>{page}</span>
            </div>
            <div className="e-sheet-barcode" style={box(84, 17, 48, 9)}>
                <Barcode value={`${serial}${page}`} />
            </div>
            <div className="e-sheet-qr" style={box(176, 17, 15, 15)}>
                <QrMark value={`TestMaker:${serial}`} />
                <span>{serial}</span>
            </div>
        </>
    );
}

function DigitGrid({
    title,
    columns,
    x,
    y,
    width,
    height,
}: {
    title: string;
    columns: number;
    x: number;
    y: number;
    width: number;
    height: number;
}) {
    return (
        <div className="e-sheet-digit-grid" style={box(x, y, width, height)}>
            <div
                className={`e-sheet-digit-title ${width <= 20 ? 'e-sheet-digit-title-narrow' : ''}`}
            >
                {title}
            </div>
            <div
                className="e-sheet-digit-empty"
                style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
                {Array.from({ length: columns }, (_, index) => (
                    <span key={index} />
                ))}
            </div>
            <div className="e-sheet-digit-rows">
                {Array.from({ length: 10 }, (_, digit) => (
                    <div
                        key={digit}
                        className="e-sheet-digit-row"
                        style={{
                            gridTemplateColumns: `repeat(${columns}, 1fr)`,
                        }}
                    >
                        {Array.from({ length: columns }, (_, index) => (
                            <span className="e-sheet-digit-circle" key={index}>
                                <span className="e-sheet-circle-label">
                                    {digit}
                                </span>
                            </span>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function ExampleCircle({ kind }: { kind: 'filled' | 'crossed' | 'partial' }) {
    return (
        <span
            aria-hidden="true"
            className={`e-sheet-example-circle e-sheet-example-circle-${kind}`}
        />
    );
}

function EnglishInstructions({ compact = false }: { compact?: boolean }) {
    return (
        <div
            className={`e-sheet-instructions ${compact ? 'e-sheet-instructions-compact' : ''}`}
        >
            <strong>INSTRUCTIONS</strong>
            <ul>
                <li>Use BLUE/BLACK ball pen or marker ONLY.</li>
                <li>Fill/Shade the circle completely.</li>
                <li>
                    EXAMPLE&nbsp;&nbsp; (I) CORRECT{' '}
                    <ExampleCircle kind="filled" />
                    &nbsp; (II) INCORRECT <ExampleCircle kind="crossed" />
                    &nbsp; (III) INCORRECT <ExampleCircle kind="partial" />
                </li>
                <li>
                    Folding, Stapling, Cutting and putting unnecessary signs and
                    identification on the sheet is strictly NOT allowed.
                </li>
                <li>
                    Please write the Roll No. Paper Code in the space allocated
                    above the circles and carefully fill/shade the circles.
                </li>
            </ul>
            <p>
                <b>DISCLAIMER:</b> IN CASE OF INCOMPLETE/CANCELLATION/MULTIPLE
                FILLING OF CIRCLES, THE ANSWER SHALL BE DECLARED AS WRONG.
            </p>
        </div>
    );
}

function UrduInstructions({ compact = false }: { compact?: boolean }) {
    return (
        <div
            className={`e-sheet-urdu-instructions ${compact ? 'e-sheet-urdu-instructions-compact' : ''}`}
            lang="ur"
            dir="rtl"
        >
            <strong>ہدایات</strong>
            <ul>
                <li>
                    امیدوار کو صرف نیلے یا کالے پین/مارکر استعمال کرنے کی اجازت
                    ہے۔
                </li>
                <li>
                    اس بات کا خاص خیال رکھیں کہ دائرہ مکمل پُر ہو اور سیاہی
                    دائرے سے باہر نہ نکلے۔
                </li>
                <li>
                    مثال: (۱) صحیح <ExampleCircle kind="filled" /> &nbsp; (۲)
                    غلط <ExampleCircle kind="crossed" /> &nbsp; (۳) غلط{' '}
                    <ExampleCircle kind="partial" />
                </li>
                <li>کاغذ کو موڑنا یا سٹیپل کرنا ممنوع ہے۔</li>
                <li>
                    دائروں کے اوپر دی گئی مخصوص جگہ پر Roll No. اور Paper Code
                    لکھیں اور نیچے دیئے گئے دائروں کو اس طرح پُر کریں کہ ہر خانے
                    میں ایک ہندسہ آئے۔
                </li>
            </ul>
            <div className="e-sheet-urdu-note">
                <strong>نوٹ:</strong>
                <p>
                    ایک سے زیادہ دائروں کو پُر کرنے/کاٹ کرنے کی صورت میں مذکورہ
                    جواب/رول نمبر/پیپر کوڈ غلط تصور ہوگا جس کی تمام ذمہ داری
                    طالب علم پر ہوگی۔
                </p>
            </div>
        </div>
    );
}

function ChoiceCell({
    choices,
}: {
    choices: Array<{ label: string; circle: string }>;
}) {
    return (
        <div className="e-sheet-choice-cell">
            {choices.map(({ label, circle }) => (
                <div className="e-sheet-choice-row" key={label}>
                    <span>{label}</span>
                    <span className="e-sheet-choice-circle">
                        <span className="e-sheet-circle-label">{circle}</span>
                    </span>
                </div>
            ))}
        </div>
    );
}

function CoverPage({
    paper,
    serial,
}: {
    paper: GeneratedPaper;
    serial: string;
}) {
    return (
        <div className="e-sheet-page" data-e-sheet-page="1">
            <PageMarks number={1} serial={serial} />
            <img
                className="e-sheet-crest"
                style={box(41, 42, 24, 28)}
                src="/images/e-sheet-board-crest.png"
                alt="Board crest"
            />
            <div
                className="e-sheet-board-urdu"
                style={box(81, 41, 93, 10)}
                lang="ur"
                dir="rtl"
            >
                بورڈ آف انٹرمیڈیٹ اینڈ سیکنڈری ایجوکیشن، لاہور
            </div>
            <div className="e-sheet-board-english" style={box(70, 53, 115, 16)}>
                BOARD OF INTERMEDIATE &amp;
                <br />
                SECONDARY EDUCATION, LAHORE
            </div>
            <div className="e-sheet-subject" style={box(80, 76, 57, 8)}>
                {paper.header.subject || 'SUBJECT'}
            </div>
            <div className="e-sheet-date" style={box(70, 89, 56, 12)}>
                <span>Date:</span>
                <div>
                    <div className="e-sheet-date-labels">
                        {['D', 'D', 'M', 'M', 'Y', 'Y', 'Y', 'Y'].map(
                            (letter, index) => (
                                <span key={index}>{letter}</span>
                            ),
                        )}
                    </div>
                    <div className="e-sheet-date-boxes">
                        {Array.from({ length: 8 }, (_, index) => (
                            <i key={index} />
                        ))}
                    </div>
                </div>
            </div>
            <div className="e-sheet-session" style={box(127, 92, 20, 9)}>
                Morning{' '}
                <span className="e-sheet-choice-circle">
                    <span className="e-sheet-circle-label">M</span>
                </span>
                <br />
                Evening{' '}
                <span className="e-sheet-choice-circle">
                    <span className="e-sheet-circle-label">E</span>
                </span>
            </div>
            <div
                className="e-sheet-side-urdu"
                style={box(7, 224, 112, 8)}
                lang="ur"
                dir="rtl"
            >
                انتباہ: براہ کرم جوابی کاپی پر اضافی پین اور اضافی صفحات لگانے
                سے اجتناب کریں۔
            </div>
            <div className="e-sheet-left-details" style={box(26, 109, 29, 132)}>
                <div>Date</div>
                <div className="e-sheet-date-write" />
                <ChoiceCell
                    choices={[
                        { label: 'Matric', circle: 'M' },
                        { label: 'Inter', circle: 'I' },
                    ]}
                />
                <ChoiceCell
                    choices={[
                        { label: 'Part 1', circle: '1' },
                        { label: 'Part 2', circle: '2' },
                    ]}
                />
                <ChoiceCell
                    choices={[
                        { label: '1st Annual', circle: 'A' },
                        { label: '2nd Annual', circle: 'S' },
                    ]}
                />
                <ChoiceCell
                    choices={[
                        { label: 'Morning', circle: 'M' },
                        { label: 'Evening', circle: 'E' },
                    ]}
                />
                <div>Subject</div>
                <div className="e-sheet-subject-write" />
            </div>
            <DigitGrid
                title="Roll No."
                columns={6}
                x={75}
                y={104}
                width={28}
                height={55}
            />
            <DigitGrid
                title="Paper Code"
                columns={4}
                x={106}
                y={104}
                width={20}
                height={55}
            />
            <div style={box(130, 102, 54, 63)}>
                <UrduInstructions />
            </div>
            <div style={box(75, 166, 108, 50)}>
                <EnglishInstructions />
            </div>
            <div
                className="e-sheet-candidate-fields"
                style={box(75, 216, 108, 51)}
            >
                <div>Name:</div>
                <div>Father’s Name:</div>
                <div>Roll Number (in words)</div>
                <div>Signature of Candidate:</div>
            </div>
            <div
                className="e-sheet-deputy-signature"
                style={box(87, 267, 83, 10)}
            >
                Signature of Deputy Superintendent:
            </div>
        </div>
    );
}

function BlankBackPage({ number, serial }: { number: number; serial: string }) {
    return (
        <div className="e-sheet-page" data-e-sheet-page={number}>
            <PageMarks number={number} serial={serial} />
            <div className="e-sheet-do-not-write" style={box(23, 103, 145, 50)}>
                <span>DON'T WRITE ON THIS PAGE</span>
                <span lang="ur" dir="rtl">
                    اس صفحہ پر کچھ نہ لکھیں
                </span>
            </div>
        </div>
    );
}

function McqResponses() {
    return (
        <div className="e-sheet-mcq-grid">
            {Array.from({ length: 4 }, (_, column) => (
                <div className="e-sheet-mcq-column" key={column}>
                    {Array.from({ length: 6 }, (_, row) => {
                        const number = column * 6 + row + 1;

                        return (
                            <div className="e-sheet-mcq-row" key={number}>
                                <b>{number}.</b>
                                {['A', 'B', 'C', 'D'].map((option) => (
                                    <span
                                        className="e-sheet-answer-circle"
                                        key={option}
                                    >
                                        <span className="e-sheet-circle-label">
                                            {option}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function AwardColumn({
    title,
    digits = 2,
}: {
    title: string;
    digits?: number;
}) {
    return (
        <div className="e-sheet-award-column">
            <div className="e-sheet-award-title">{title}</div>
            <div className="e-sheet-award-label">Marks</div>
            <div
                className="e-sheet-award-empty"
                style={{ gridTemplateColumns: `repeat(${digits},1fr)` }}
            >
                {Array.from({ length: digits }, (_, index) => (
                    <span key={index} />
                ))}
            </div>
            <div className="e-sheet-award-digits">
                {Array.from({ length: 10 }, (_, digit) => (
                    <div
                        key={digit}
                        style={{ gridTemplateColumns: `repeat(${digits},1fr)` }}
                    >
                        {Array.from({ length: digits }, (_, index) => (
                            <span className="e-sheet-digit-circle" key={index}>
                                <span className="e-sheet-circle-label">
                                    {digit}
                                </span>
                            </span>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function MarksPage({ serial }: { serial: string }) {
    return (
        <div className="e-sheet-page" data-e-sheet-page="3">
            <PageMarks number={3} serial={serial} />
            <div style={box(26, 39, 102, 42)}>
                <EnglishInstructions compact />
            </div>
            <div style={box(26, 82, 102, 44)}>
                <UrduInstructions compact />
            </div>
            <DigitGrid
                title="Paper Code"
                columns={4}
                x={130}
                y={39}
                width={26}
                height={83}
            />
            <DigitGrid
                title="Sub-Examiner Board I.D"
                columns={6}
                x={160}
                y={39}
                width={31}
                height={83}
            />
            <div className="e-sheet-mcq-heading" style={box(31, 131, 159, 8)}>
                <b>MCQs RESPONSE PART</b>{' '}
                <small>(TO BE FILLED BY THE STUDENT)</small>{' '}
                <span lang="ur" dir="rtl">
                    (امیدوار خود پُر کرے)
                </span>
            </div>
            <div className="e-sheet-mcq-direction" style={box(26, 140, 165, 7)}>
                PLEASE CAREFULLY READ THE QUESTIONS AND FILL THE ANSWER
                CORRECTLY
            </div>
            <div style={box(26, 148, 165, 39)}>
                <McqResponses />
            </div>
            <div className="e-sheet-award" style={box(26, 192, 165, 70)}>
                <div className="e-sheet-award-heading">
                    <b>AWARD SHEET</b>
                    <small>(FOR OFFICIAL USE IN MARKING CENTRE)</small>
                    <span lang="ur" dir="rtl">
                        (صرف ممتحن پُر کرے)
                    </span>
                </div>
                <div className="e-sheet-award-columns">
                    <AwardColumn title="MCQs" />
                    {Array.from({ length: 8 }, (_, index) => (
                        <AwardColumn key={index} title={`Q ${index + 2}`} />
                    ))}
                    <AwardColumn title="Total" digits={3} />
                </div>
            </div>
            <div
                className="e-sheet-examiner-signature"
                style={box(65, 271, 105, 8)}
            >
                Signature of Sub-Examiner: <span />
            </div>
        </div>
    );
}

function AnswerPage({
    number,
    serial,
    page,
}: {
    number: number;
    serial: string;
    page: AnswerSpacePage;
}) {
    return (
        <div className="e-sheet-page" data-e-sheet-page={number}>
            <PageMarks number={number} serial={serial} />
            <div className="e-sheet-answer-heading" style={box(26, 34, 165, 6)}>
                Section{' '}
                {formatQuestionLabel(
                    page.sectionIndex - 1,
                    'roman',
                    'roman',
                ).toUpperCase()}{' '}
                - {page.sectionTitle}
            </div>
            <div className="e-sheet-answer-body" style={box(26, 40, 165, 241)}>
                {page.blocks.map((block, index) => (
                    <div
                        className="e-sheet-answer-block"
                        key={`${block.label}-${index}`}
                    >
                        <div className="e-sheet-answer-label">
                            {block.label}
                            {block.continued ? ' (continued)' : ''}
                        </div>
                        {Array.from({ length: block.lines }, (_, line) => (
                            <div className="e-sheet-writing-line" key={line} />
                        ))}
                        <div className="e-sheet-answer-end">
                            <span />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ESheetView({
    paper,
    setIndex,
    scope,
    onBack,
}: {
    paper: GeneratedPaper;
    setIndex: number;
    scope?: { patternId: number; classId: number; subjectId: number };
    onBack: () => void;
}) {
    const serial = useMemo(
        () => pageSerial(paper, setIndex),
        [paper, setIndex],
    );
    const objectiveCount = paper.sections
        .filter(
            (section) =>
                section.category === 'Objective Questions' &&
                section.orRole !== 'alternative',
        )
        .reduce(
            (total, section) => total + objectiveSectionQuestionCount(section),
            0,
        );
    const pagesRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [linesByType, setLinesByType] = useState<Record<number, number>>({});
    const [isLoadingSpaces, setIsLoadingSpaces] = useState(Boolean(scope));
    const [spacesError, setSpacesError] = useState<string | null>(null);
    const [retryVersion, setRetryVersion] = useState(0);
    const patternId = scope?.patternId;
    const classId = scope?.classId;
    const subjectId = scope?.subjectId;
    const exceedsCapacity = objectiveCount > 24;
    const answerPages = useMemo(
        () => buildAnswerSpacePages(paper, linesByType),
        [paper, linesByType],
    );
    const canExport = !isLoadingSpaces && !spacesError && !exceedsCapacity;

    useEffect(() => {
        if (!patternId || !classId || !subjectId) {
            setIsLoadingSpaces(false);
            setSpacesError(null);
            setLinesByType({});

            return;
        }

        const controller = new AbortController();
        const params = new URLSearchParams({
            pattern_id: String(patternId),
            class_id: String(classId),
            subject_id: String(subjectId),
        });
        setIsLoadingSpaces(true);
        setSpacesError(null);
        fetch(`/papers/generate/e-sheet-answer-spaces?${params}`, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Could not load E-Sheet answer spaces.');
                }

                return response.json() as Promise<{
                    linesByType: Record<number, number>;
                }>;
            })
            .then((data) => {
                if (!controller.signal.aborted) {
                    setLinesByType(data.linesByType ?? {});
                }
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) {
                    return;
                }

                setSpacesError(
                    error instanceof Error
                        ? error.message
                        : 'Could not load E-Sheet answer spaces.',
                );
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setIsLoadingSpaces(false);
                }
            });

        return () => controller.abort();
    }, [patternId, classId, subjectId, retryVersion]);

    async function downloadPdf() {
        if (!pagesRef.current || isDownloading || !canExport) {
            return;
        }

        setIsDownloading(true);
        const progress = toast.loading('Preparing E-Sheet PDF…');

        try {
            const [{ toCanvas }, { jsPDF }] = await Promise.all([
                import('html-to-image'),
                import('jspdf'),
            ]);
            await document.fonts.ready;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true,
            });
            const pages = pagesRef.current.querySelectorAll<HTMLElement>(
                '[data-e-sheet-page]',
            );

            for (const [index, page] of Array.from(pages).entries()) {
                const canvas = await toCanvas(page, {
                    backgroundColor: '#fff',
                    pixelRatio: index < 4 ? 2 : 1.5,
                    cacheBust: false,
                });

                if (index) {
                    pdf.addPage();
                }

                pdf.addImage(
                    canvas.toDataURL('image/png'),
                    'PNG',
                    0,
                    0,
                    210,
                    297,
                    undefined,
                    'FAST',
                );
            }

            const name = (paper.header.subject || 'Paper').replace(
                /[\\/:*?"<>|]/g,
                '-',
            );

            pdf.save(`${name} E-Sheet.pdf`);
            toast.success('E-Sheet PDF downloaded', { id: progress });
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Could not download E-Sheet PDF.',
                { id: progress },
            );
        } finally {
            setIsDownloading(false);
        }
    }

    return (
        <div data-e-sheet-view className="e-sheet-view">
            <style>{'@page { size: A4 portrait; margin: 0; }'}</style>
            <div className="e-sheet-toolbar">
                <button type="button" onClick={onBack}>
                    <ArrowLeftIcon className="size-4" /> Back to Paper
                </button>
                <strong>E-Sheet</strong>
                <div className="e-sheet-toolbar-actions">
                    <button
                        type="button"
                        onClick={() => void downloadPdf()}
                        disabled={isDownloading || !canExport}
                    >
                        {isDownloading ? (
                            <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                            <DownloadIcon className="size-4" />
                        )}{' '}
                        Download PDF
                    </button>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        disabled={!canExport}
                    >
                        <PrinterIcon className="size-4" /> Print
                    </button>
                </div>
            </div>
            {exceedsCapacity && (
                <p className="e-sheet-capacity" role="alert">
                    This E-Sheet has 24 MCQ answer rows, but the paper has{' '}
                    {objectiveCount}. Printing is disabled so no answers are
                    omitted.
                </p>
            )}
            {isLoadingSpaces && (
                <p className="e-sheet-capacity">Loading answer spaces…</p>
            )}
            {spacesError && (
                <div className="e-sheet-capacity" role="alert">
                    {spacesError}{' '}
                    <button
                        type="button"
                        onClick={() =>
                            setRetryVersion((current) => current + 1)
                        }
                    >
                        Retry
                    </button>
                </div>
            )}
            <div ref={pagesRef} className="e-sheet-pages">
                <CoverPage paper={paper} serial={serial} />
                <BlankBackPage number={2} serial={serial} />
                <MarksPage serial={serial} />
                <BlankBackPage number={4} serial={serial} />
                {!isLoadingSpaces &&
                    !spacesError &&
                    answerPages.map((page, index) => (
                        <AnswerPage
                            key={index}
                            number={index + 5}
                            serial={serial}
                            page={page}
                        />
                    ))}
            </div>
        </div>
    );
}
