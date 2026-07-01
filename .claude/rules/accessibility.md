---
paths:
  - "**/*.tsx"
  - "**/*.html"
---

# Accessibility

The researcher persona is change-averse; an inaccessible UI is one more reason
not to adopt. Target WCAG 2.1 AA.

## Semantic HTML first

Use the native element for the job: `button` for actions, `a` for navigation,
`nav`/`main`/`header`/`footer` for landmarks, `ul`/`ol` for lists, `table` for
tabular data. A native element brings keyboard and screen-reader support for
free. Don't rebuild it from `div`/`span` and ARIA.

## ARIA only when needed

No ARIA is better than wrong ARIA. Reach for it only when no native element
fits, and prefer the smallest addition (`aria-label`, `aria-expanded`,
`aria-current`). Never override a native role.

## Keyboard

Everything operable by mouse must work by keyboard. Logical tab order, visible
focus (never `outline: none` without a replacement), no keyboard traps. Don't
add `tabindex` greater than 0.

## Forms

Every input has an associated `label` (wrap it or use `htmlFor`/`id`). Mark
required fields in text, not color alone. Tie error messages to their field with
`aria-describedby` and announce them.

## Images and icons

`alt` on every `img`: descriptive when it carries meaning, `alt=""` when purely
decorative. Icon-only buttons need an accessible name (`aria-label`).

## Color and contrast

At least 4.5:1 for normal text, 3:1 for large text and UI controls. Never use
color as the only way to convey information (status, errors, required).

## Headings and structure

One `h1` per page; don't skip heading levels. Use headings for structure, not
for sizing text.
