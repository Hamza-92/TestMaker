import type {
    GeneratedPaper,
    GeneratedPaperHeader,
    GeneratedPaperQuestion,
    GeneratedPaperSection,
    PaperSettings,
} from './types';

export type PreviewMedium = 'English' | 'Urdu' | 'Both';

export function defaultPaperPreview(
    settings: PaperSettings,
    header: GeneratedPaperHeader,
    medium: PreviewMedium,
): GeneratedPaper {
    const text = (english: string, urdu: string) =>
        medium === 'English'
            ? english
            : medium === 'Urdu'
              ? `<div dir="rtl">${urdu}</div>`
              : `<div>${english}</div><div dir="rtl">${urdu}</div>`;
    const question = (
        id: string,
        english: string,
        urdu: string,
    ): GeneratedPaperQuestion => ({
        id,
        sourceQuestionId: null,
        text: text(english, urdu),
        source: null,
        sourceLabel: null,
        chapterLabel: null,
        topicLabel: null,
        imageUrl: null,
        imageSize: 'md',
        options: [],
        answerLines: 0,
    });
    const section = (
        id: string,
        typeId: number,
        english: string,
        urdu: string,
        category: GeneratedPaperSection['category'],
        questions: GeneratedPaperQuestion[],
        marksEach: number,
        key: string,
        columns: number,
    ): GeneratedPaperSection => ({
        id,
        questionTypeId: typeId,
        title: medium === 'Urdu' ? urdu : english,
        titleEnglish: medium === 'Urdu' ? null : english,
        titleUrdu: medium === 'English' ? null : urdu,
        category,
        requiredQuestions: questions.length,
        totalQuestions: questions.length,
        marksEach,
        questions,
        columns,
        paperSectionKey: key,
    });
    const mcqs: {
        english: string;
        urdu: string;
        options: [string, string][];
        correct: number;
    }[] = [
        {
            english: 'Which part of a plant absorbs water from the soil?',
            urdu: 'پودے کا کون سا حصہ مٹی سے پانی جذب کرتا ہے؟',
            options: [
                ['Roots', 'جڑیں'],
                ['Leaves', 'پتے'],
                ['Flowers', 'پھول'],
                ['Stem', 'تنا'],
            ],
            correct: 0,
        },
        {
            english: 'Which structure controls the activities of a cell?',
            urdu: 'خلیے کی سرگرمیوں کو کون سی ساخت کنٹرول کرتی ہے؟',
            options: [
                ['Cell wall', 'خلیاتی دیوار'],
                ['Vacuole', 'خلا'],
                ['Nucleus', 'مرکزہ'],
                ['Cytoplasm', 'سائٹوپلازم'],
            ],
            correct: 2,
        },
        {
            english: 'The process by which green plants make food is called:',
            urdu: 'وہ عمل جس کے ذریعے سبز پودے خوراک بناتے ہیں، کہلاتا ہے:',
            options: [
                ['Respiration', 'تنفس'],
                ['Photosynthesis', 'ضیائی تالیف'],
                ['Digestion', 'ہضم'],
                ['Transpiration', 'عمل تبخیر'],
            ],
            correct: 1,
        },
        {
            english: 'Which gas is needed for aerobic respiration?',
            urdu: 'ہوائی تنفس کے لیے کون سی گیس ضروری ہے؟',
            options: [
                ['Nitrogen', 'نائٹروجن'],
                ['Carbon dioxide', 'کاربن ڈائی آکسائیڈ'],
                ['Hydrogen', 'ہائیڈروجن'],
                ['Oxygen', 'آکسیجن'],
            ],
            correct: 3,
        },
        {
            english:
                'Which tissue transports oxygen and nutrients in the human body?',
            urdu: 'انسانی جسم میں کون سا ٹشو آکسیجن اور غذائی اجزا منتقل کرتا ہے؟',
            options: [
                ['Muscle', 'عضلات'],
                ['Blood', 'خون'],
                ['Bone', 'ہڈی'],
                ['Nerve', 'عصب'],
            ],
            correct: 1,
        },
        {
            english: 'Water is transported from roots to leaves through:',
            urdu: 'جڑوں سے پتوں تک پانی کس کے ذریعے منتقل ہوتا ہے؟',
            options: [
                ['Xylem', 'زائلم'],
                ['Phloem', 'فلوئم'],
                ['Epidermis', 'ایپی ڈرمس'],
                ['Stomata', 'مسام'],
            ],
            correct: 0,
        },
        {
            english: 'Which vitamin is produced in the skin in sunlight?',
            urdu: 'سورج کی روشنی میں جلد میں کون سا وٹامن بنتا ہے؟',
            options: [
                ['Vitamin A', 'وٹامن اے'],
                ['Vitamin B', 'وٹامن بی'],
                ['Vitamin D', 'وٹامن ڈی'],
                ['Vitamin K', 'وٹامن کے'],
            ],
            correct: 2,
        },
        {
            english: 'An ecosystem includes:',
            urdu: 'ایک ماحولیاتی نظام میں شامل ہوتے ہیں:',
            options: [
                ['Only plants', 'صرف پودے'],
                [
                    'Living and non-living components',
                    'جاندار اور غیر جاندار اجزا',
                ],
                ['Only animals', 'صرف جانور'],
                ['Only water', 'صرف پانی'],
            ],
            correct: 1,
        },
        {
            english: 'Most ATP in a eukaryotic cell is produced in:',
            urdu: 'یوکاریوٹک خلیے میں زیادہ تر اے ٹی پی کہاں بنتا ہے؟',
            options: [
                ['Ribosomes', 'رائبوسومز'],
                ['Nucleus', 'مرکزہ'],
                ['Mitochondria', 'مائٹوکانڈریا'],
                ['Vacuoles', 'خلا'],
            ],
            correct: 2,
        },
        {
            english: 'A major function of the skeleton is to:',
            urdu: 'ڈھانچے کا ایک اہم کام ہے:',
            options: [
                [
                    'Support and protect the body',
                    'جسم کو سہارا دینا اور حفاظت کرنا',
                ],
                ['Digest food', 'خوراک ہضم کرنا'],
                ['Produce oxygen', 'آکسیجن بنانا'],
                ['Absorb sunlight', 'سورج کی روشنی جذب کرنا'],
            ],
            correct: 0,
        },
    ];
    const objectives = mcqs.map((item, index) => ({
        ...question(`mcq-${index + 1}`, item.english, item.urdu),
        options: item.options.map(([english, urdu], optionIndex) => ({
            id: `mcq-${index + 1}-option-${optionIndex}`,
            text: text(english, urdu),
            isCorrect: optionIndex === item.correct,
        })),
    }));
    const shorts = [
        [
            'Define biology and name its two main branches.',
            'حیاتیات کی تعریف کریں اور اس کی دو اہم شاخوں کے نام لکھیں۔',
        ],
        [
            'Differentiate between a tissue and an organ.',
            'ٹشو اور عضو میں فرق بیان کریں۔',
        ],
        [
            'Explain the importance of water for living organisms.',
            'جانداروں کے لیے پانی کی اہمیت بیان کریں۔',
        ],
        [
            'Describe two functions of plant roots.',
            'پودے کی جڑوں کے دو کام بیان کریں۔',
        ],
        [
            'What is a balanced diet? Why is it important?',
            'متوازن غذا کیا ہے؟ یہ کیوں ضروری ہے؟',
        ],
        [
            'State two differences between respiration and photosynthesis.',
            'تنفس اور ضیائی تالیف کے درمیان دو فرق بیان کریں۔',
        ],
        [
            'How does pollution affect living organisms?',
            'آلودگی جانداروں کو کیسے متاثر کرتی ہے؟',
        ],
    ].map(([english, urdu], index) =>
        question(`short-${index + 1}`, english, urdu),
    );
    const longs = [
        [
            'Describe the structure of a plant cell and explain the functions of its main organelles.',
            'پودے کے خلیے کی ساخت بیان کریں اور اس کے اہم عضیات کے افعال کی وضاحت کریں۔',
        ],
        [
            'Explain photosynthesis, write its word equation, and discuss the importance of sunlight and chlorophyll.',
            'ضیائی تالیف کی وضاحت کریں، اس کی لفظی مساوات لکھیں اور سورج کی روشنی اور کلوروفل کی اہمیت بیان کریں۔',
        ],
        [
            'Describe the components of an ecosystem and explain how energy flows through a food chain.',
            'ماحولیاتی نظام کے اجزا بیان کریں اور وضاحت کریں کہ غذائی زنجیر میں توانائی کیسے منتقل ہوتی ہے۔',
        ],
    ].map(([english, urdu], index) =>
        question(`long-${index + 1}`, english, urdu),
    );

    return {
        id: 'default-settings-preview',
        header,
        settings,
        sectioning: { active: true, groups: [], medium },
        sections: [
            section(
                'objectives',
                1,
                'Choose the correct option.',
                'درست جواب منتخب کریں۔',
                'Objective Questions',
                objectives,
                1,
                'objective',
                1,
            ),
            section(
                'shorts',
                2,
                'Answer the following short questions.',
                'درج ذیل مختصر سوالات کے جواب دیں۔',
                'Subjective Questions',
                shorts,
                2,
                'subjective-1',
                medium === 'Both' ? 1 : 2,
            ),
            section(
                'longs',
                3,
                'Answer the following long questions.',
                'درج ذیل تفصیلی سوالات کے جواب دیں۔',
                'Subjective Questions',
                longs,
                5,
                'subjective-2',
                1,
            ),
        ],
    };
}
