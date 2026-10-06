import { useBlocker } from "@tanstack/react-router";

import { ConfirmDialog } from "#/confirm-button.tsx";
import { m } from "#/paraglide/messages.js";

export function UnsavedChangesGuard({ isDirty }: { isDirty: boolean }) {
  const { status, proceed, reset } = useBlocker({
    disabled: !isDirty,
    enableBeforeUnload: true,
    withResolver: true,
    shouldBlockFn: ({ current, next }) => current.pathname !== next.pathname,
  });
  return (
    <ConfirmDialog
      open={status === "blocked"}
      onOpenChange={(open) => open || reset?.()}
      title={m.unsaved_changes_title()}
      description={m.unsaved_changes_description()}
      confirmLabel={m.unsaved_changes_leave()}
      onConfirm={() => proceed?.()}
    />
  );
}
