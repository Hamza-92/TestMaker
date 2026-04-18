import { BookOpenIcon, GraduationCapIcon, LayoutGridIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export interface AccessPattern { id: number; name: string; short_name: string; }
export interface AccessClass   { id: number; name: string; }
export interface AccessSubject { id: number; name_eng: string; name_ur: string; }

interface Props {
    patterns:        AccessPattern[];
    classes:         AccessClass[];
    subjects:        AccessSubject[];
    patternClassMap: Record<string, number[]>;  // patternId → classIds
    classSubjectMap: Record<string, number[]>;  // "patternId:classId" → subjectIds
    patternAccess:   number[] | null;
    classAccess:     number[] | null;
    subjectAccess:   number[] | null;
    onPatternChange: (v: number[] | null) => void;
    onClassChange:   (v: number[] | null) => void;
    onSubjectChange: (v: number[] | null) => void;
}

export function HierarchicalAccessControl({
    patterns, classes, subjects,
    patternClassMap, classSubjectMap,
    patternAccess, classAccess, subjectAccess,
    onPatternChange, onClassChange, onSubjectChange,
}: Props) {

    // ── Derived available sets ────────────────────────────────────────────────

    const effectivePatternIds = patternAccess === null ? patterns.map(p => p.id) : patternAccess;

    const availableClassIdSet = new Set<number>(
        effectivePatternIds.flatMap(pid => patternClassMap[String(pid)] ?? [])
    );
    const availableClasses = classes.filter(c => availableClassIdSet.has(c.id));

    const effectiveClassIds = classAccess === null
        ? availableClasses.map(c => c.id)
        : classAccess.filter(id => availableClassIdSet.has(id));

    const availableSubjectIdSet = new Set<number>(
        effectivePatternIds.flatMap(pid =>
            effectiveClassIds.flatMap(cid => classSubjectMap[`${pid}:${cid}`] ?? [])
        )
    );
    const availableSubjects = subjects.filter(s => availableSubjectIdSet.has(s.id));

    // ── Cascade helpers ───────────────────────────────────────────────────────

    function cascadeSubjects(pids: number[], cids: number[]) {
        if (subjectAccess === null) return;
        const valid = new Set<number>(
            pids.flatMap(pid => cids.flatMap(cid => classSubjectMap[`${pid}:${cid}`] ?? []))
        );
        onSubjectChange(subjectAccess.filter(id => valid.has(id)));
    }

    function cascadeClasses(pids: number[], currentClassAccess: number[] | null) {
        if (currentClassAccess === null) return;
        const valid = new Set<number>(pids.flatMap(pid => patternClassMap[String(pid)] ?? []));
        const filtered = currentClassAccess.filter(id => valid.has(id));
        onClassChange(filtered);
        cascadeSubjects(pids, filtered);
    }

    // ── Pattern handlers ──────────────────────────────────────────────────────

    function handlePatternToggleAll(allAccess: boolean) {
        onPatternChange(allAccess ? null : patterns.map(p => p.id));
    }

    function handlePatternToggleItem(id: number, checked: boolean) {
        const current = patternAccess ?? patterns.map(p => p.id);
        const next = checked ? [...new Set([...current, id])] : current.filter(v => v !== id);
        const normalized: number[] | null = next.length === patterns.length ? null : next;
        onPatternChange(normalized);
        cascadeClasses(normalized === null ? patterns.map(p => p.id) : next, classAccess);
    }

    // ── Class handlers ────────────────────────────────────────────────────────

    function handleClassToggleAll(allAccess: boolean) {
        onClassChange(allAccess ? null : availableClasses.map(c => c.id));
    }

    function handleClassToggleItem(id: number, checked: boolean) {
        const current = classAccess ?? availableClasses.map(c => c.id);
        const next = checked ? [...new Set([...current, id])] : current.filter(v => v !== id);
        const normalized: number[] | null = next.length === availableClasses.length ? null : next;
        onClassChange(normalized);
        cascadeSubjects(effectivePatternIds, normalized === null ? effectiveClassIds : next);
    }

    // ── Subject handlers ──────────────────────────────────────────────────────

    function handleSubjectToggleAll(allAccess: boolean) {
        onSubjectChange(allAccess ? null : availableSubjects.map(s => s.id));
    }

    function handleSubjectToggleItem(id: number, checked: boolean) {
        const current = subjectAccess ?? availableSubjects.map(s => s.id);
        const next = checked ? [...new Set([...current, id])] : current.filter(v => v !== id);
        onSubjectChange(next.length === availableSubjects.length ? null : next);
    }

    // ── Render ────────────────────────────────────────────────────────────────

    function badge(access: number[] | null, total: number) {
        if (access === null) return 'All access';
        if (access.length === 0) return 'None selected';
        return `${access.length} / ${total}`;
    }

    return (
        <div className="space-y-4">

            {/* ── Patterns ── */}
            <SectionBox
                icon={<BookOpenIcon className="size-4" />}
                label="Patterns"
                isAll={patternAccess === null}
                onToggleAll={handlePatternToggleAll}
                badge={badge(patternAccess, patterns.length)}
            >
                <div className="grid gap-px p-2 sm:grid-cols-2 lg:grid-cols-3">
                    {patterns.map(p => (
                        <CheckRow
                            key={p.id}
                            label={p.short_name ? `${p.name} (${p.short_name})` : p.name}
                            checked={(patternAccess ?? patterns.map(x => x.id)).includes(p.id)}
                            onChange={checked => handlePatternToggleItem(p.id, checked)}
                        />
                    ))}
                </div>
            </SectionBox>

            {/* ── Classes ── */}
            <SectionBox
                icon={<GraduationCapIcon className="size-4" />}
                label="Classes"
                isAll={classAccess === null}
                onToggleAll={handleClassToggleAll}
                badge={badge(classAccess, availableClasses.length)}
            >
                {availableClasses.length === 0 ? (
                    <p className="text-muted-foreground px-3 py-3 text-xs italic">
                        No classes linked to the selected patterns.
                    </p>
                ) : patternAccess === null ? (
                    <div className="grid gap-px p-2 sm:grid-cols-2 lg:grid-cols-3">
                        {availableClasses.map(c => (
                            <CheckRow
                                key={c.id}
                                label={c.name}
                                checked={(classAccess ?? availableClasses.map(x => x.id)).includes(c.id)}
                                onChange={checked => handleClassToggleItem(c.id, checked)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="divide-y">
                        {patternAccess.map(pid => {
                            const pattern = patterns.find(p => p.id === pid);
                            if (!pattern) return null;
                            const pClasses = classes.filter(c =>
                                (patternClassMap[String(pid)] ?? []).includes(c.id)
                            );
                            if (pClasses.length === 0) return null;
                            return (
                                <div key={pid} className="px-3 py-3">
                                    <p className="text-muted-foreground mb-1.5 text-xs font-semibold uppercase tracking-wide">
                                        {pattern.short_name ?? pattern.name}
                                    </p>
                                    <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
                                        {pClasses.map(c => (
                                            <CheckRow
                                                key={c.id}
                                                label={c.name}
                                                checked={(classAccess ?? availableClasses.map(x => x.id)).includes(c.id)}
                                                onChange={checked => handleClassToggleItem(c.id, checked)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionBox>

            {/* ── Subjects ── */}
            <SectionBox
                icon={<LayoutGridIcon className="size-4" />}
                label="Subjects"
                isAll={subjectAccess === null}
                onToggleAll={handleSubjectToggleAll}
                badge={badge(subjectAccess, availableSubjects.length)}
            >
                {availableSubjects.length === 0 ? (
                    <p className="text-muted-foreground px-3 py-3 text-xs italic">
                        No subjects linked to the selected patterns and classes.
                    </p>
                ) : classAccess === null && patternAccess === null ? (
                    <div className="grid gap-px p-2 sm:grid-cols-2 lg:grid-cols-3">
                        {availableSubjects.map(s => (
                            <CheckRow
                                key={s.id}
                                label={s.name_eng}
                                checked={(subjectAccess ?? availableSubjects.map(x => x.id)).includes(s.id)}
                                onChange={checked => handleSubjectToggleItem(s.id, checked)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="divide-y">
                        {effectiveClassIds.map(cid => {
                            const cls = classes.find(c => c.id === cid);
                            if (!cls) return null;
                            const subjectIdsForClass = new Set<number>(
                                effectivePatternIds.flatMap(pid => classSubjectMap[`${pid}:${cid}`] ?? [])
                            );
                            const classSubs = subjects.filter(s => subjectIdsForClass.has(s.id));
                            if (classSubs.length === 0) return null;
                            return (
                                <div key={cid} className="px-3 py-3">
                                    <p className="text-muted-foreground mb-1.5 text-xs font-semibold uppercase tracking-wide">
                                        {cls.name}
                                    </p>
                                    <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
                                        {classSubs.map(s => (
                                            <CheckRow
                                                key={s.id}
                                                label={s.name_eng}
                                                checked={(subjectAccess ?? availableSubjects.map(x => x.id)).includes(s.id)}
                                                onChange={checked => handleSubjectToggleItem(s.id, checked)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionBox>

        </div>
    );
}

// ── Internal sub-components ───────────────────────────────────────────────────

function SectionBox({ icon, label, isAll, onToggleAll, badge, children }: {
    icon: React.ReactNode;
    label: string;
    isAll: boolean;
    onToggleAll: (v: boolean) => void;
    badge: string;
    children: React.ReactNode;
}) {
    return (
        <div className="border-input rounded-lg border">
            <label className="bg-muted/40 flex cursor-pointer items-center gap-2.5 rounded-t-lg border-b px-3 py-2.5">
                <Checkbox
                    checked={isAll}
                    onCheckedChange={checked => onToggleAll(!!checked)}
                />
                <span className="text-muted-foreground flex items-center gap-1.5">{icon}</span>
                <span className="text-sm font-medium">{label}</span>
                <span className="text-muted-foreground ml-auto text-xs tabular-nums">{badge}</span>
            </label>
            {children}
        </div>
    );
}

function CheckRow({ label, checked, onChange }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors">
            <Checkbox checked={checked} onCheckedChange={v => onChange(!!v)} />
            <span className="min-w-0 truncate">{label}</span>
        </label>
    );
}
