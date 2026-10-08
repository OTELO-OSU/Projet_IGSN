# Updating the Terms of Use

This guide is for anyone rewording the public Terms of Use (`/terms-of-use`). No programming knowledge is needed.

## Where the text lives

- The text: [packages/domain/messages/en.json](../packages/domain/messages/en.json), every line whose key starts with `charter_`.
- The layout (section order, the list of international standards and their links): [packages/design-system/src/components/ui/charter.tsx](../packages/design-system/src/components/ui/charter.tsx).

The text sits in `domain` so the admin app can show the same charter, one edit changing both.

## Reword

1. In `en.json`, find the `charter_` line holding the text.
2. Change the text between the quotes, leaving the key untouched.

Writing rules:

- Plain text only: HTML, Markdown and links show exactly as typed.
- Quote a button or field name with curly quotes, as in “I have read and accept these Terms of Use”: a straight `"` would end the text early.
- Keep the comma at the end of the line.
- The section numbers are part of the titles (`charter_purpose_title`: "1. Purpose of the service"), so renumber them by hand.
- A user commitment is a `_lead` line in bold followed by its text line (`charter_commitment_english_lead`, `charter_commitment_english`): reword both together.
- The closing FAQ sentence is three lines (`charter_faq_note_start`, `charter_faq_link`, `charter_faq_note_end`): the middle one is the link to the FAQ.

## Add or remove a bullet, a paragraph or a section

This needs a developer: the lines are listed by key in `charter.tsx`, and the list of standards is written there too.

## Check your change

1. Run `make generate`, then `pnpm --filter @projet-igsn/frontend exec tsc -b`: a misspelled key is reported by name.
2. Run `make dev` and open http://localhost:3000/terms-of-use.
3. Run `pnpm fmt:apply` to tidy the formatting.

The site is in English only today, so `en.json` is the one text file to edit.
