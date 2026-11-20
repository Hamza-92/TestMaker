import type { GeneratedPaper, GeneratedPaperSection } from '../types';
import { formatQuestionLabel } from '../types';

export interface AnswerSpaceBlock {
    label: string;
    lines: number;
    continued: boolean;
    sectionTitle: string;
    sectionIndex: number;
}

export interface AnswerSpacePage {
    blocks: AnswerSpaceBlock[];
    sectionTitle: string;
    sectionIndex: number;
}

const DEFAULT_LINES = 10;
const PAGE_HEIGHT_MM = 241;
const LABEL_HEIGHT_MM = 10;
const LINE_HEIGHT_MM = 9;
const END_HEIGHT_MM = 5;
const MAX_LINES_ON_PAGE = Math.floor(
    (PAGE_HEIGHT_MM - LABEL_HEIGHT_MM - END_HEIGHT_MM) / LINE_HEIGHT_MM,
);

function linesForType(
    typeId: number | null,
    linesByType: Record<number, number>,
): number {
    const value = typeId === null ? undefined : linesByType[typeId];

    return typeof value === 'number' && Number.isInteger(value)
        ? Math.min(30, Math.max(1, value))
        : DEFAULT_LINES;
}

function sectionTitle(
    section: GeneratedPaperSection,
    medium: string | undefined,
): string {
    return (
        (medium === 'Urdu' ? section.titleUrdu : section.titleEnglish) ||
        section.title
    );
}

export function buildAnswerSpacePages(
    paper: GeneratedPaper,
    linesByType: Record<number, number>,
): AnswerSpacePage[] {
    const entries: Omit<AnswerSpaceBlock, 'continued'>[] = [];
    const medium = paper.sectioning?.medium;
    let questionNumber = paper.sections.some(
        (section) => section.category === 'Objective Questions',
    )
        ? 2
        : 1;
    let sectionIndex = 0;
    const layoutNumbers = new Map<string, number>();

    for (const section of paper.sections) {
        if (
            section.category !== 'Subjective Questions' ||
            section.orRole === 'alternative'
        ) {
            continue;
        }

        const currentNumber =
            section.layoutNumberGroup &&
            layoutNumbers.has(section.layoutNumberGroup)
                ? layoutNumbers.get(section.layoutNumberGroup)!
                : questionNumber++;

        if (section.layoutNumberGroup) {
            layoutNumbers.set(section.layoutNumberGroup, currentNumber);
        }

        sectionIndex++;
        const title = sectionTitle(section, medium);
        const add = (index: number, lines: number, suffix = '') => {
            entries.push({
                label: `Q. No. ${currentNumber} (${formatQuestionLabel(index, 'roman', 'roman')})${suffix}`,
                lines,
                sectionTitle: title,
                sectionIndex,
            });
        };

        if (section.multipart) {
            section.multipart.rows.forEach((row, rowIndex) => {
                row.parts.forEach((part) => {
                    add(
                        rowIndex,
                        linesForType(part.typeId, linesByType),
                        ` (${part.key})`,
                    );
                });
            });
            continue;
        }

        const members = section.orGroupId
            ? paper.sections.filter(
                  (candidate) => candidate.orGroupId === section.orGroupId,
              )
            : [section];
        const count = Math.max(
            ...members.map((member) => member.questions.length),
            0,
        );

        for (let index = 0; index < count; index++) {
            add(
                index,
                Math.max(
                    ...members.map((member) =>
                        linesForType(member.questionTypeId, linesByType),
                    ),
                ),
            );
        }
    }

    const pages: AnswerSpacePage[] = [];
    let page: AnswerSpacePage | null = null;
    let usedHeight = 0;

    for (const entry of entries) {
        let remaining = entry.lines;
        let continued = false;

        while (remaining > 0) {
            const available = page
                ? Math.floor(
                      (PAGE_HEIGHT_MM -
                          usedHeight -
                          LABEL_HEIGHT_MM -
                          END_HEIGHT_MM) /
                          LINE_HEIGHT_MM,
                  )
                : MAX_LINES_ON_PAGE;

            if (
                !page ||
                available < 1 ||
                (remaining <= MAX_LINES_ON_PAGE && remaining > available) ||
                (remaining > MAX_LINES_ON_PAGE && page.blocks.length > 0)
            ) {
                page = {
                    blocks: [],
                    sectionTitle: entry.sectionTitle,
                    sectionIndex: entry.sectionIndex,
                };
                pages.push(page);
                usedHeight = 0;
            }

            const capacity = Math.floor(
                (PAGE_HEIGHT_MM -
                    usedHeight -
                    LABEL_HEIGHT_MM -
                    END_HEIGHT_MM) /
                    LINE_HEIGHT_MM,
            );
            const lines = Math.min(remaining, capacity);
            page.blocks.push({ ...entry, lines, continued });
            usedHeight +=
                LABEL_HEIGHT_MM + lines * LINE_HEIGHT_MM + END_HEIGHT_MM;
            remaining -= lines;
            continued = true;
        }
    }

    return pages;
}
