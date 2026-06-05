export type PaperImageSize = 'sm' | 'md' | 'lg';
export type PaperSectionCategory =
    | 'Objective Questions'
    | 'Subjective Questions';

export interface PaperQuestionOption {
    id: string;
    text: string;
}

export interface GeneratedPaperQuestion {
    id: string;
    sourceQuestionId: number | null;
    text: string;
    source: string | null;
    sourceLabel: string | null;
    chapterLabel: string | null;
    topicLabel: string | null;
    imageUrl: string | null;
    imageSize: PaperImageSize;
    options: PaperQuestionOption[];
    answerLines: number;
}

export interface GeneratedPaperSection {
    id: string;
    questionTypeId: number | null;
    category: PaperSectionCategory;
    title: string;
    requiredQuestions: number;
    totalQuestions: number;
    marksEach: number;
    questions: GeneratedPaperQuestion[];
}

export interface GeneratedPaperHeader {
    schoolName: string;
    exam: string;
    className: string;
    section: string;
    subject: string;
    studentName: string;
    type: string;
    date: string;
    duration: string;
    marks: number;
    rollNo: string;
}

export interface GeneratedPaper {
    id: string;
    header: GeneratedPaperHeader;
    sections: GeneratedPaperSection[];
}
