# TestMaker — Customer App Design System

This describes the design language for the **customer side** of TestMaker
(`resources/js/pages/customer/**`). It exists so another agent can build a
new page that looks like it belongs, without re-deriving the rules.

The reference implementation is **[Saved Papers](resources/js/pages/customer/papers/index.tsx)**.
When something here is ambiguous, copy that page.

> The superadmin and auth sides are a **different, older** design. Do not
> apply this document to them, and do not "fix" them to match.

---

## 1. How to use this

1. Read §3 (Principles) and §11 (Anti-patterns) first. §11 is the most
   valuable section — it records what was tried and rejected.
2. Build from **`@/components/tm`** (§7). Do not hand-roll cards, buttons,
   modals or empty states.
3. Match the density and spacing numbers in §6 exactly. They were arrived
   at by overshooting in both directions.
4. Before finishing: `npm run types:check`, `npx eslint <files>`, and
   `npm run build`. Build notes are in §12.

---

## 2. The one-line summary

> Clean, colourful, soft, compact. Solid fills only — never gradients.
> Colour must always **mean** something. Cut any text that restates its own
> label or icon.

---

## 3. Principles

**P1 — Solid fills, no gradients.**
No gradient backgrounds, gradient text, gradient borders or glow shadows,
anywhere. This is absolute.

**P2 — Colour carries meaning, never decoration.**
Every colour answers "what is this?" or "what state is this in?". A tone
is never applied to make something look livelier.

**P3 — Soft, not vivid.**
Saturated colour reads cheap here. Tints for surfaces, mid-tones for text
and icons. See §4.

**P4 — Cut text that restates itself.**
If a line repeats its title, its label, or its icon, delete it. Keep text
that tells you something you'd otherwise have to click to discover.

**P5 — Page content is full width.**
No `mx-auto max-w-*` on a page root. Only modals, prose blocks and the
printed-paper preview get a max width.

**P6 — Motion is quick, soft and purposeful.**
~180–260ms, decelerating. Everything respects `prefers-reduced-motion`.

---

## 4. Colour

### Brand (blue) — the primary accent

Defined as `--color-brand-50 … --color-brand-950` in
[app.css](resources/css/app.css). Use for primary actions, active nav,
links, focus rings, and the "selected" state.

`brand-600` is the primary button fill. `brand-50` / `brand-100` are tints.

### Semantic tones

Fixed meanings. Never use one because it "looks nice".

| Tone | Means | Used by |
|---|---|---|
| **Blue** (brand) | primary action, active, selected, info | `Button variant="primary"`, `Badge tone="info"` |
| **Emerald** | saved, published, success | `Badge tone="saved"`, success toast |
| **Amber** | draft, pending, warning | `Badge tone="draft"`, warning toast |
| **Rose** | destructive, error | `Button variant="danger"`, error toast |
| **Violet** | templates | `Badge tone="template"` |
| **Slate** | everything neutral | default |

### Data-driven accents (`--tm-accent`)

Some colours come from the database — a folder's colour is a user-picked
hex. Those **cannot** be Tailwind classes. Set a custom property inline and
let CSS read it:

```tsx
<Card style={{ '--tm-accent': folder.color } as React.CSSProperties}>
  <div className="tm-accent-tile">…</div>
</Card>
```

- `.tm-accent-tile` — background at 14% of the accent (24% dark), icon at
  full accent
- `.tm-lift` — hover shadow tinted by the same accent

One variable drives both, so a tile's colour and the shadow it casts can
never disagree. Both fall back to a neutral slate when unset.

### Contrast

Body and label text must clear **4.5:1**. Small uppercase labels are the
usual offender — `slate-400` on white fails; use `slate-500`.

---

## 5. Typography

Font is **Montserrat** (set globally; don't override).

| Role | Size | Weight |
|---|---|---|
| Page title | `text-xl` | `font-semibold` + `tracking-tight` |
| Page meta (under title) | `text-sm` | normal, `slate-500` |
| Card / row title | `text-sm` | `font-semibold` |
| Body, controls, nav | `text-[13px]` | `font-medium` |
| Metadata, captions | `text-xs` | normal, `slate-500` |
| Group labels | `text-[10px]` uppercase, `tracking-wide` | `font-semibold`, `slate-500` |
| Badges | `text-[11px]` | `font-medium` |

Montserrat is wide. `tracking-tight` is right at `text-xl`+, but **too
aggressive below ~14px** — it pinches the letterforms. Use
`tracking-[-0.006em]` if you need a nudge at small sizes.

---

## 6. Density and geometry

Tuned between two rejected extremes: an early roomy pass (40px rows) and an
over-compact one (28px rows) that was unusable on touch.

| Element | Value |
|---|---|
| Inline control height | **`h-9` (36px)** — exported as `CONTROL_H` |
| Card padding | `px-5 py-4` (`padding="md"`), `px-4 py-3` (`sm`) |
| Page content padding | `p-4 md:p-6` |
| Gap between page sections | `space-y-5` |
| Gap between list rows | `space-y-3` |
| Corner radius — cards, empty states | `rounded-xl` |
| Corner radius — buttons, inputs, tabs | `rounded-lg` |
| Icons in rows / buttons | `size-4` |
| Leading tile on a list row | `size-10`, `rounded-lg` |

**`CONTROL_H` is load-bearing.** `Input`, `SearchInput` and `Tabs` all
import it from [input.tsx](resources/js/components/tm/input.tsx). Anything
that sits inline beside them must use it too, or the row will not align.

---

## 7. The component kit — `@/components/tm`

Import from the barrel: `import { Button, Card } from '@/components/tm'`.

| Component | Notes |
|---|---|
| `Button` | `variant`: primary / secondary / ghost / danger. `size`: sm / md / icon-sm / icon. Use `asChild` to style an Inertia `<Link>`. |
| `Card` | `padding`: none / sm / md / lg. `interactive` adds hover lift. |
| `Badge` | `tone`: neutral / draft / saved / info / template / danger. |
| `PageHeader` | `title`, `meta`, `actions`. **No description prop, by design** (P4). |
| `EmptyState` | `icon`, `title`, `action`, optional `hint`. Leave `hint` unset unless it adds real information. |
| `Input` / `SearchInput` | `SearchInput` includes a clear button and takes `onValueChange`. |
| `Tabs` | Segmented control. Hugs its labels — never stretches. |
| `Checkbox` | Real `<input>`, sr-only, supports `indeterminate`. |
| `Pagination` | Server-side. Renders nothing when `last_page <= 1`. |
| `SelectionBar` | Bulk-action bar. Visible for the whole of selection mode. |
| `notify` | Toasts: `notify.success/error/warning/info(title, { description })`. |

### Do not use `@/components/ui/*`

That's the Laravel/shadcn scaffold. It is still used by auth, settings and
superadmin, so **do not modify or delete it** — but don't use it on
customer pages either. Two concrete reasons it bites:

- `ui/input` focuses with the `--ring` token, which is the **dark navy**
  used by the superadmin side, not brand blue.
- `ui/card` and `ui/dialog` are unused by customer pages and don't match
  this system.

---

## 8. Interaction patterns

### Hover on list rows

Cards **lift**; they do not change background.

```
transform: translateY(-2px);
box-shadow: 0 10px 22px -8px <accent at 38%>;
transition: 180ms cubic-bezier(0.22, 1, 0.36, 1);
```

Background is deliberately left alone because it's already spoken for by
the selected state. Use `<Card interactive>` — it applies `.tm-lift`.

### List entrance

Rows fade up 8px, 260ms, **28ms stagger capped at index 9** (so 25 rows
don't take a full second).

```tsx
<div key={listKey} className="space-y-3">
  {rows.map((row, i) => (
    <Card className="tm-appear" style={{ animationDelay: `${Math.min(i, 9) * 28}ms` }} />
  ))}
</div>
```

Two non-obvious requirements:

- **The container needs a `key`** built from page + tab + filters.
  Animations only run on mount, so without it the entrance never replays
  when the visible set changes.
- **`.tm-appear` uses `animation-fill-mode: backwards`, not `both`.**
  With `both`, the final keyframe (`transform: none`) is retained and wins
  the cascade permanently, which silently kills `.tm-lift`'s hover.

### Selection mode (bulk actions)

No checkboxes at rest. The pattern:

1. A **`Select`** button in `PageHeader` actions turns the mode on.
2. In the mode, the whole card is clickable (`role="checkbox"` +
   `aria-checked`, Enter/Space supported).
3. The row's **leading tile swaps its glyph** — bookmark → tick. It keeps
   its own colour; the fill does **not** turn solid.
4. Per-row actions **hide**, so clicking can only mean "select".
5. `SelectionBar` shows counts, select-all, actions, and a `Done` exit.
   It stays visible at 0 selected — otherwise there's no way out.
6. Selection clears on **any** navigation. Acting on rows you can't see is
   how people delete the wrong thing.

### Row actions revealed on hover

If an action appears only on hover, take it **out of the flex flow**
(absolutely position it) and let it share a slot with whatever is already
there. Reserving a permanent empty slot leaves visible dead space; leaving
it in-flow shifts every sibling's alignment.

### Toasts

Top-centre, 64px offset, 400px wide. Solid colour dot + 3px accent rail on
the left. Errors last 6s, everything else 4s.

Wire **both** paths:

- Client: `notify.success('3 papers deleted')`
- Server: `->with('toast', ['type' => 'success', 'message' => '…'])`,
  surfaced by `useFlashToast`

### Error handling — guard only the request

```ts
let res: Response;
try {
  res = await fetch(url, init);
} catch {
  notify.error('Could not save', { description: 'Check your connection…' });
  return;
}
if (!res.ok) {
  notify.error('Could not save', { description: describeFailure(res.status) });
  return;
}
notify.success('Saved');
```

A `try` wrapped around the follow-up work too will report a client-side
bug as a network failure. Map statuses to real sentences: 403 → "You can
only change papers you own", 419 → "Your session expired", 5xx → "The
server hit an error".

### Confirmation

Use `ConfirmDialog`. **Never `window.confirm()`** — an OS dialog in a
styled app looks broken.

---

## 9. Writing the words

Apply P4 mechanically.

| Don't | Do |
|---|---|
| "Generate New Paper" | **New Paper** (the `+` says "new") |
| "Search by name, subject, class" | **Search papers** |
| "No papers saved yet" + "Generate a paper and save it to see it here." | **No papers yet** (the button says the rest) |
| "Are you sure you want to delete this paper? This cannot be undone." | **This cannot be undone.** (the title says *Delete Paper*) |
| "Showing 1–25 of 60" | **1–25 of 60** |

Keep a line when it isn't recoverable from the screen — e.g. *"Drafts are
saved from the generator when you go back."* explains something the empty
state genuinely cannot.

---

## 10. Data and layout rules

- **Paginate server-side.** Return one page plus counts; never ship the
  full table and slice it client-side.
- **URL is the state.** Tab, folder, search and page all live in the query
  string, written by a single `navigate()` helper. Deep links and the back
  button then work for free.
- **Full width** (P5). Exceptions: modals, prose, and the printed-paper
  preview (`data-paper-shell`), which represents a physical page.
- **Server re-checks ownership.** UI hiding an action is not enforcement.

---

## 11. Anti-patterns — all of these were tried and rejected

This is the section to read twice.

| Rejected | Why |
|---|---|
| Aurora gradient washes, drifting blurred blobs, frosted glass | Read as a template, "not a professional SaaS app" |
| Gradient text, gradient borders, coloured glow shadows | Same |
| Tailwind `-500`/`-600` at full saturation for decorative tints | Too hard/vivid — soften to tints or low-chroma mid-tones |
| Solid colour block as a selected-state indicator | A column of solid blue tiles "looks too odd" — swap the **glyph**, keep the tint |
| Checkboxes sitting on every card | Cluttered — use selection mode instead |
| Reserving an empty slot to keep hover actions aligned | Leaves obvious dead space |
| 28px rows / 48px header | Too cramped |
| Near-monochrome with a single accent | Too plain — colour is wanted, just soft and meaningful |
| Descriptions that restate their title | Noise |
| `window.confirm()` | Breaks the visual language |
| Background-colour change on row hover | Conflicts with the selected state; lift instead |

---

## 12. Technical constraints

**Tailwind class names must be literal.** The scanner reads source text, so
`text-${tone}-500` never generates. Map tones to complete class strings:

```ts
const TONES = {
  emerald: { chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15' },
};
```

**Dark mode is required.** Every colour decision needs a `dark:` counterpart.

**Building.** The default `php` on PATH is 8.2 and fails composer's `>= 8.3`
check, which makes `npm run build` fail inside the wayfinder plugin.
Prepend the 8.5 runtime first:

```powershell
$env:Path = "C:\php;$env:Path"
npm run build
```

`dev.ps1` already does this and starts the whole stack (app on **:8000**,
vite on 5173).

**Known repo issues, pre-existing:** `php artisan test` currently fatals —
`makeSuperAdmin()` is declared in both `CustomerSubscriptionPaymentsTest.php`
and `QuestionTypeManagementTest.php` — and this PHP build has no sqlite
driver, so the in-memory test database can't open.

---

## 13. Page-build checklist

- [ ] Full width — no `mx-auto max-w-*` on the page root
- [ ] `PageHeader` with `title` + factual `meta`; no description
- [ ] Everything from `@/components/tm`; nothing from `components/ui/*`
- [ ] Every inline control is `CONTROL_H`
- [ ] Solid fills only; no gradients
- [ ] Every colour maps to a meaning in §4
- [ ] Every string passes P4
- [ ] `EmptyState` distinguishes "nothing yet" from "no search results"
- [ ] Rows use `<Card interactive>` and `.tm-appear` with a keyed container
- [ ] Destructive actions use `ConfirmDialog`, never `window.confirm()`
- [ ] Every mutation produces a toast on both success and failure
- [ ] `try` wraps only the request, never the follow-up
- [ ] Dark mode checked
- [ ] Keyboard: focus rings, Enter/Space on custom controls, Escape closes
- [ ] `npm run types:check`, `eslint`, and `npm run build` all pass
