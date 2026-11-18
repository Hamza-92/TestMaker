import type { GeneratedPaperQuestion } from '../types';

export interface PaperImageChange {
    originalSrc: string;
    replacementSrc?: string;
    width: number;
    height: number;
}

function sameImageSource(left: string, right: string): boolean {
    try {
        return (
            new URL(left, window.location.href).href ===
            new URL(right, window.location.href).href
        );
    } catch {
        return left === right;
    }
}

function updateHtmlImages(
    value: string | null | undefined,
    change: PaperImageChange,
): string | null | undefined {
    if (!value || !/<img\b/i.test(value)) {
        return value;
    }

    const container = document.createElement('div');
    container.innerHTML = value;
    let changed = false;

    container.querySelectorAll('img').forEach((image) => {
        if (
            !sameImageSource(
                image.getAttribute('src') ?? '',
                change.originalSrc,
            )
        ) {
            return;
        }

        if (change.replacementSrc) {
            image.setAttribute('src', change.replacementSrc);
        }

        image.setAttribute('width', String(change.width));
        image.setAttribute('height', String(change.height));
        image.setAttribute('data-paper-resized', 'true');
        image.style.width = `${change.width}px`;
        image.style.height = `${change.height}px`;
        image.style.maxHeight = 'none';
        image.style.maxWidth = '100%';
        changed = true;
    });

    return changed ? container.innerHTML : value;
}

export function updateQuestionImage(
    question: GeneratedPaperQuestion,
    change: PaperImageChange,
): GeneratedPaperQuestion {
    const separateImage =
        question.imageUrl &&
        sameImageSource(question.imageUrl, change.originalSrc);

    return {
        ...question,
        text: updateHtmlImages(question.text, change) ?? question.text,
        description: updateHtmlImages(question.description, change),
        federalStatement: updateHtmlImages(question.federalStatement, change),
        sameStatement: updateHtmlImages(question.sameStatement, change),
        options: question.options.map((option) => ({
            ...option,
            text: updateHtmlImages(option.text, change) ?? option.text,
        })),
        passageQuestions: question.passageQuestions?.map((passage) => ({
            ...passage,
            text: updateHtmlImages(passage.text, change) ?? passage.text,
            options: passage.options.map((option) => ({
                ...option,
                text: updateHtmlImages(option.text, change) ?? option.text,
            })),
        })),
        ...(separateImage
            ? {
                  imageUrl: change.replacementSrc ?? question.imageUrl,
                  imageWidth: change.width,
                  imageHeight: change.height,
              }
            : {}),
    };
}
