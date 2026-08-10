import type { FormEvent } from "react";

import { render } from "vitest-browser-react";

import { ConfirmButton } from "./confirm-button.tsx";

const labels = {
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  closeLabel: "Close",
};

const renderConfirmButton = (onConfirm: () => void) =>
  render(
    <ConfirmButton
      title="Delete this sample?"
      description="This cannot be undone."
      onConfirm={onConfirm}
      {...labels}
    >
      Delete
    </ConfirmButton>,
  );

describe("ConfirmButton", () => {
  it("should run the action only once the user confirms", async () => {
    const onConfirm = vi.fn();
    const screen = await renderConfirmButton(onConfirm);

    await screen.getByRole("button", { name: "Delete" }).click();

    await expect
      .element(screen.getByRole("dialog", { name: "Delete this sample?" }))
      .toHaveTextContent("This cannot be undone.");
    expect(onConfirm).not.toHaveBeenCalled();

    await screen.getByRole("button", { name: "Confirm" }).click();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog").elements()).toEqual([]);
  });

  it("should leave the action unrun when the user cancels", async () => {
    const onConfirm = vi.fn();
    const screen = await renderConfirmButton(onConfirm);
    await screen.getByRole("button", { name: "Delete" }).click();

    await screen.getByRole("button", { name: "Cancel" }).click();

    expect(screen.getByRole("dialog").elements()).toEqual([]);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("should forward the button props to the trigger", async () => {
    const screen = await render(
      <ConfirmButton
        variant="ghost"
        aria-label="Remove Marie Curie"
        disabled
        title="Remove this collaborator?"
        description="She will lose access."
        onConfirm={vi.fn()}
        {...labels}
      >
        x
      </ConfirmButton>,
    );

    await expect
      .element(screen.getByRole("button", { name: "Remove Marie Curie" }))
      .toBeDisabled();
    expect(screen.getByRole("dialog").elements()).toEqual([]);
  });

  it("should not submit the surrounding form when opening the dialog", async () => {
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    const screen = await render(
      <form onSubmit={onSubmit}>
        <ConfirmButton
          title="Publish this sample?"
          description="Publishing cannot be undone."
          onConfirm={vi.fn()}
          {...labels}
        >
          Publish
        </ConfirmButton>
      </form>,
    );

    await screen.getByRole("button", { name: "Publish" }).click();

    await expect
      .element(screen.getByRole("dialog", { name: "Publish this sample?" }))
      .toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
