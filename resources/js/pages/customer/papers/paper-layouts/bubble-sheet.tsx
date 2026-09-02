import type { PaperSettings } from './types';

const BUBBLE_OPTIONS = ['A', 'B', 'C', 'D'] as const;

type PaperMedium = 'English' | 'Urdu' | 'Both';

function BubbleSheetTitle({ medium }: { medium: PaperMedium }) {
    if (medium === 'Urdu') {
        return <span dir="rtl">معروضی سوالات کی جوابی شیٹ</span>;
    }

    if (medium === 'Both') {
        return (
            <>
                <span dir="ltr">MCQs Answer Sheet</span>
                <span aria-hidden="true"> / </span>
                <span dir="rtl">معروضی سوالات کی جوابی شیٹ</span>
            </>
        );
    }

    return <span dir="ltr">MCQs Answer Sheet</span>;
}

export function BubbleSheet({
    count,
    medium,
    settings,
}: {
    count: number;
    medium: PaperMedium;
    settings: PaperSettings;
}) {
    const normalizedCount = Math.min(Math.max(Math.round(count), 1), 200);

    return (
        <section
            data-bubble-sheet
            aria-label="MCQs answer sheet"
            className="w-full"
        >
            {settings.bubbleSheetHeadingEnabled && (
                <h2
                    data-paper-heading
                    className="mb-[1mm] text-center font-bold"
                    style={{
                        fontSize: `${settings.headingSize}px`,
                        lineHeight: settings.headingLineHeight,
                        breakAfter: 'avoid',
                    }}
                >
                    <BubbleSheetTitle medium={medium} />
                </h2>
            )}

            <div
                className="grid gap-[1mm]"
                style={{
                    gridTemplateColumns: 'repeat(auto-fill, minmax(30mm, 1fr))',
                }}
            >
                {Array.from({ length: normalizedCount }, (_, index) => (
                    <div
                        key={index}
                        className="flex min-h-[7mm] items-center gap-[1mm] border border-black px-[1.25mm] py-[0.75mm]"
                        style={{ breakInside: 'avoid' }}
                    >
                        <span
                            dir="ltr"
                            className="min-w-[7mm] shrink-0 text-center text-[9px] leading-none font-bold"
                        >
                            {settings.bubbleSheetNumberFormat === 'question'
                                ? `Q.${index + 1}`
                                : index + 1}
                        </span>
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-[0.75mm]">
                            {BUBBLE_OPTIONS.map((option) => (
                                <span
                                    key={option}
                                    dir="ltr"
                                    className="flex size-[4.5mm] shrink-0 items-center justify-center rounded-full border border-black text-[8px] leading-none font-semibold"
                                >
                                    {option}
                                </span>
                            ))}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}
