---
paths:
  - "**/*.tsx"
  - "**/*.html"
---

# Accessibility

Target WCAG 2.1 AA: the researcher persona is change-averse, and an inaccessible UI is one more reason not to adopt.

## Semantic HTML first

- Use the native element for the job (`button` for actions, `a` for navigation, `nav`/`main`/`header`/`footer` for landmarks, `ul`/`ol` for lists, `table` for tabular data).
- Never rebuild a native element from `div`/`span` and ARIA.

## ARIA only when needed

- Reach for ARIA only when no native element fits: no ARIA is better than wrong ARIA.
- Prefer the smallest addition (`aria-label`, `aria-expanded`, `aria-current`).
- Never override a native role.

## Keyboard

- Everything operable by mouse MUST work by keyboard.
- Keep tab order logical, focus visible (never `outline: none` without a replacement), and no keyboard traps.
- Never add `tabindex` greater than 0.

## Forms

- Every input has an associated `label` (wrap it or use `htmlFor`/`id`).
- Mark required fields in text, not color alone.
- Tie error messages to their field with `aria-describedby` and announce them.

## Images and icons

- Put `alt` on every `img`: descriptive when it carries meaning, `alt=""` when decorative.
- Give icon-only buttons an accessible name (`aria-label`).

## Color and contrast

- Contrast at least 4.5:1 for normal text, 3:1 for large text and UI controls.
- Never use color as the only way to convey information.

## Headings and structure

- One `h1` per page, no skipped heading levels.
- Use headings for structure, never for sizing text.
