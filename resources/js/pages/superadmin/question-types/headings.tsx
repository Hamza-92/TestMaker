import { Head, Link } from '@inertiajs/react';
import { ArrowRightIcon, HeadingIcon, ShapesIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FloatingCombobox } from '@/components/ui/floating-combobox';
import type { ComboboxOptionItem } from '@/components/ui/floating-combobox';

interface QuestionType {
    id: number;
    name: string;
    name_ur: string | null;
    heading_en: string;
    heading_ur: string | null;
    is_objective: boolean;
    rules_count: number;
}

export default function QuestionTypeHeadings({
    questionTypes,
}: {
    questionTypes: QuestionType[];
}) {
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const options = useMemo<ComboboxOptionItem[]>(
        () =>
            questionTypes.map((type) => ({
                id: type.id,
                label: type.name,
                searchLabel: [type.name, type.name_ur, type.heading_en]
                    .filter(Boolean)
                    .join(' '),
                hint: `${type.is_objective ? 'Objective' : 'Subjective'} · ${type.rules_count} ${type.rules_count === 1 ? 'rule' : 'rules'}`,
            })),
        [questionTypes],
    );
    const selected = questionTypes.find((type) => type.id === selectedId);

    return (
        <>
            <Head title="Type Headings" />
            <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
                <div>
                    <h1 className="h1-semibold">Type Headings</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Choose a question type, then manage its headings for
                        different patterns, classes, and subjects.
                    </p>
                </div>

                <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <ShapesIcon className="size-5" />
                        </div>
                        <div>
                            <h2 className="font-semibold">
                                Choose question type
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Search by type name or default heading.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <FloatingCombobox
                            label="Question type"
                            options={options}
                            value={
                                options.find(
                                    (option) =>
                                        Number(option.id) === selectedId,
                                ) ?? null
                            }
                            onChange={(option) =>
                                setSelectedId(
                                    option === null ? null : Number(option.id),
                                )
                            }
                            placeholder="Search question types"
                            leadingIcon={HeadingIcon}
                        />
                        {selected ? (
                            <Button asChild className="h-11 shrink-0">
                                <Link
                                    href={`/superadmin/question-types/${selected.id}/headings`}
                                >
                                    Manage headings
                                    <ArrowRightIcon className="size-4" />
                                </Link>
                            </Button>
                        ) : (
                            <Button disabled className="h-11 shrink-0">
                                Manage headings
                                <ArrowRightIcon className="size-4" />
                            </Button>
                        )}
                    </div>

                    {selected && (
                        <div className="mt-5 rounded-xl border bg-muted/25 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium">{selected.name}</p>
                                <span className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                                    {selected.rules_count}{' '}
                                    {selected.rules_count === 1
                                        ? 'rule'
                                        : 'rules'}
                                </span>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                                Default: {selected.heading_en}
                            </p>
                            {selected.heading_ur && (
                                <p
                                    dir="rtl"
                                    className="mt-1 text-right text-muted-foreground"
                                    style={{
                                        fontFamily:
                                            '"Jameel Noori Nastaleeq", serif',
                                        fontSize: '16px',
                                    }}
                                >
                                    {selected.heading_ur}
                                </p>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

QuestionTypeHeadings.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Type Headings' },
    ],
};
