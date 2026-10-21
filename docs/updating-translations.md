# Updating translations

This guide is about the texts the public site shows in English and French.

## Where the texts live

| File                                                         | Texts                                                                                                                                                        | Languages            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| [packages/frontend/messages/](../packages/frontend/messages) | The public site: home, search, sample page, FAQ, legal pages                                                                                                 | `en.json`, `fr.json` |
| [packages/domain/messages/](../packages/domain/messages)     | Vocabulary labels shared by both apps: materials, sample types, oceans, ages, and the sample form's placeholders and hints, also read by the import template | `en.json`, `fr.json` |
| [packages/admin/messages/](../packages/admin/messages)       | The admin app                                                                                                                                                | `en.json` only       |

The admin app reads only the English vocabulary labels.

Each line pairs a key, never shown, with its text:

```json
"search_landing_title": "Search for a sample",
```

The same key holds the French text in `fr.json`:

```json
"search_landing_title": "Rechercher un échantillon",
```

The code shows a text by its key, written `m.search_landing_title()`.

## Change a text

1. Search `en.json` for the English text to find its key.
2. Change the English text, leaving the key untouched.
3. Change the text of the same key in `fr.json`.

Writing rules:

- Keep each placeholder in braces, such as `{count}`, exactly as in English: the site replaces it with a value.
- Keep each `\n` line break where the English has one.
- Quote a button or field name with curly quotes: a straight `"` ends the text early.
- In French, put a non-breaking space (U+00A0) before `:`, `;`, `?`, `!` and inside `« »`.
- In French, use the curly apostrophe `’`.

## Add a text

1. Add the key and its English text to `en.json`.
2. Add the same key at the same position in `fr.json`, with its French text.
3. Show it in the code with `m.<key>()`.

A new vocabulary value follows its own steps, in [updating-the-sample-form.md](updating-the-sample-form.md).

## Remove a text

Delete the key from both `en.json` and `fr.json`.

## Check your change

1. Run the parity specs:

   ```sh
   pnpm test packages/frontend/src/i18n packages/domain/src/messages-parity.spec.ts
   ```

2. Run `make dev` and open the page under http://localhost:3000/fr and http://localhost:3000/en.
3. Switch language with the EN / FR toggle in the header.

The parity specs fail when `fr.json` misses a key of `en.json` or lists the keys in another order. The frontend spec also fails when a French text drops a placeholder or a line break.

The site shows the English text for a key missing from `fr.json`, so the specs are the only warning.

## Add a language

1. Add its code to `locales` in [packages/frontend/project.inlang/settings.json](../packages/frontend/project.inlang/settings.json).
2. In [packages/frontend/src/i18n/paraglide.ts](../packages/frontend/src/i18n/paraglide.ts), add a pair such as `["de", "/de/search"]` to each entry of `urlPatterns`.
3. Copy `en.json` to `<code>.json` in `packages/frontend/messages/` and `packages/domain/messages/`, then translate it.
4. Add a `locale_name_<code>` key to every frontend message file, holding the language's own name, such as "Deutsch".
5. Add that key to `LOCALE_NAMES` in [packages/frontend/src/i18n/locale-switch.tsx](../packages/frontend/src/i18n/locale-switch.tsx).
6. Copy both parity specs for the new code.

The header toggle and the search engine links then list the new language on their own.

## Limits

- The admin app is in English only.
- The search box matches material labels in English only, as [ADR 0018](adr/0018-sample-search-semantics.md) records.
- Page addresses keep their English names after the language prefix, such as `/fr/search`.
