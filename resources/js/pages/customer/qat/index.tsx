import { Head } from '@inertiajs/react';

type Subject = {
    id: number;
    academic_year: string;
    class_name: string;
    subject_name: string;
    chapter_count: number;
};

export default function QatIndex({ subjects }: { subjects: Subject[] }) {
    return (
        <div className="mx-auto max-w-5xl space-y-6 p-6">
            <Head title="QAT Tests" />
            <div>
                <h1 className="text-2xl font-semibold">QAT Tests</h1>
                <p className="text-sm text-muted-foreground">
                    Available QAT practice catalogue for your school.
                </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {subjects.map((subject) => (
                    <div
                        key={subject.id}
                        className="rounded-xl border bg-card p-5"
                    >
                        <div className="text-xs text-muted-foreground">
                            {subject.academic_year}
                        </div>
                        <h2 className="mt-1 font-semibold">
                            {subject.class_name} · {subject.subject_name}
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {subject.chapter_count} chapters
                        </p>
                    </div>
                ))}
            </div>
            {!subjects.length && (
                <p className="rounded-xl border p-5 text-sm text-muted-foreground">
                    No QAT content is available in your granted scope yet.
                </p>
            )}
            <p className="text-sm text-muted-foreground">
                Paper creation will become available after QAT paper formats are
                configured.
            </p>
        </div>
    );
}
