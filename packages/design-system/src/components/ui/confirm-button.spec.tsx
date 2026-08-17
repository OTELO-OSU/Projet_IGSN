import type { FormEvent } from "react";

import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";

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

  it("should keep the action locked until the exact confirm phrase is typed", async () => {
    const onConfirm = vi.fn();
    const screen = await render(
      <ConfirmButton
        title="Delete this group?"
        description="This cannot be undone."
        confirmPhrase={{ text: "DELETE", label: "Type DELETE to confirm" }}
        onConfirm={onConfirm}
        {...labels}
      >
        Delete
      </ConfirmButton>,
    );
    await screen.getByRole("button", { name: "Delete" }).click();

    await expect
      .element(screen.getByRole("button", { name: "Confirm" }))
      .toBeDisabled();

    await screen.getByLabelText("Type DELETE to confirm").fill("delete");

    await expect
      .element(screen.getByRole("button", { name: "Confirm" }))
      .toBeDisabled();

    await screen.getByLabelText("Type DELETE to confirm").fill("DELETE");
    await screen.getByRole("button", { name: "Confirm" }).click();

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("should confirm when the user presses enter in the confirm phrase field", async () => {
    const onConfirm = vi.fn();
    const screen = await render(
      <ConfirmButton
        title="Delete this group?"
        description="This cannot be undone."
        confirmPhrase={{ text: "DELETE", label: "Type DELETE to confirm" }}
        onConfirm={onConfirm}
        {...labels}
      >
        Delete
      </ConfirmButton>,
    );
    await screen.getByRole("button", { name: "Delete" }).click();

    await screen.getByLabelText("Type DELETE to confirm").fill("DELETE");
    await userEvent.keyboard("{Enter}");

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog").elements()).toEqual([]);
  });

  it("should ignore enter in the confirm phrase field while the phrase is wrong", async () => {
    const onConfirm = vi.fn();
    const screen = await render(
      <ConfirmButton
        title="Delete this group?"
        description="This cannot be undone."
        confirmPhrase={{ text: "DELETE", label: "Type DELETE to confirm" }}
        onConfirm={onConfirm}
        {...labels}
      >
        Delete
      </ConfirmButton>,
    );
    await screen.getByRole("button", { name: "Delete" }).click();

    await screen.getByLabelText("Type DELETE to confirm").fill("delete");
    await userEvent.keyboard("{Enter}");

    expect(onConfirm).not.toHaveBeenCalled();
    await expect.element(screen.getByRole("dialog")).toBeVisible();
  });

  it("should ask for the confirm phrase again after a cancel", async () => {
    const onConfirm = vi.fn();
    const screen = await render(
      <ConfirmButton
        title="Delete this group?"
        description="This cannot be undone."
        confirmPhrase={{ text: "DELETE", label: "Type DELETE to confirm" }}
        onConfirm={onConfirm}
        {...labels}
      >
        Delete
      </ConfirmButton>,
    );
    await screen.getByRole("button", { name: "Delete" }).click();
    await screen.getByLabelText("Type DELETE to confirm").fill("DELETE");
    await screen.getByRole("button", { name: "Cancel" }).click();

    await screen.getByRole("button", { name: "Delete" }).click();

    await expect
      .element(screen.getByLabelText("Type DELETE to confirm"))
      .toHaveValue("");
    await expect
      .element(screen.getByRole("button", { name: "Confirm" }))
      .toBeDisabled();
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
