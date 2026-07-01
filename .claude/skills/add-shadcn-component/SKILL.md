---
name: add-shadcn-component
description: Use when adding or updating a shadcn/ui component (Button, Dialog, Select...) for the admin or frontend apps. Enforces installing into the design-system package via the root pnpm shadcn script, never into an app.
---

# Add a shadcn component

Components MUST live in `packages/design-system`, never in an app (architecture
rule). The root `shadcn` script runs the CLI there, so run it from the repo root:

```sh
pnpm shadcn add <component>   # e.g. pnpm shadcn add dialog
```

## Steps

1. **Skip if it exists** in `packages/design-system/src/components/ui/`.
2. **Add it** with the command above.
3. **Check the generated imports.** Open the new file:
   - internal imports use `#/*` (e.g. `#/lib/utils.ts`), not `@/*`;
   - new packages (radix, `lucide-react`...) are `design-system` deps, add via the
     catalog (dependencies rule: sign-off for a brand-new library);
   - sibling `ui` components it imports exist under `components/ui/`.
4. **Consume it** via the subpath, never a relative path into `design-system`:
   ```tsx
   import { Dialog } from "@projet-igsn/design-system/components/ui/dialog";
   ```

## Verify

`design-system` has no build; apps bundle its source, so a broken import only
surfaces on an app build. Build every consumer: `pnpm -F <app> build`.
