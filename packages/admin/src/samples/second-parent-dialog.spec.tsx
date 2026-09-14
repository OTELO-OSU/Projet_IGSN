import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { worker } from "../../test/msw.ts";
import { SecondParentDialog } from "./second-parent-dialog.tsx";

const FIRST: SampleParent = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
  name: "Massif Central 2026",
  material: "rock_and_sediment.mineral",
};

const SECOND: SampleParent = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3302",
  igsn: "01K072TVWVFK5A1RRZ5MY4PPKA",
  name: "Vosges 2026",
  material: "rock_and_sediment.mineral",
};

async function renderDialog() {
  const searches: string[] = [];
  worker.use(
    http.get("*/admin/samples/parents", ({ request }) => {
      const url = new URL(request.url);
      searches.push(url.search);
      return HttpResponse.json({ data: [SECOND] });
    }),
  );
  const onContinue = vi.fn();
  const onCancel = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const screen = await render(
    <QueryClientProvider client={queryClient}>
      <SecondParentDialog
        firstParent={FIRST}
        onContinue={onContinue}
        onCancel={onCancel}
      />
    </QueryClientProvider>,
  );
  return Object.assign(screen, { searches, onContinue, onCancel });
}

const pickSecondParent = async (
  screen: Awaited<ReturnType<typeof renderDialog>>,
) => {
  await screen.getByLabelText("Second parent (optional)").click();
  await screen.getByPlaceholder("Search by name or IGSN").fill("Vosges");
  await screen.getByRole("option", { name: /Vosges 2026/ }).click();
};

describe("SecondParentDialog", () => {
  it("should show the first parent's name and IGSN in a field the user cannot change", async () => {
    const screen = await renderDialog();

    const field = screen.getByLabelText("First parent");
    await expect.element(field).toHaveValue(`${FIRST.name} (${FIRST.igsn})`);
    await expect.element(field).toBeDisabled();
  });

  it("should search the samples eligible as a parent, excluding the first one", async () => {
    const screen = await renderDialog();

    await screen.getByLabelText("Second parent (optional)").click();
    await screen.getByPlaceholder("Search by name or IGSN").fill("Vosges");

    await expect
      .element(
        screen.getByRole("option", {
          name: new RegExp(`Vosges 2026.*${SECOND.igsn}`),
        }),
      )
      .toBeVisible();
    await expect
      .poll(() => screen.searches)
      .toContain(`?search=Vosges&exclude=${FIRST.id}`);
  });

  it("should continue with no second parent", async () => {
    const screen = await renderDialog();

    await screen.getByRole("button", { name: "Continue" }).click();

    expect(screen.onContinue).toHaveBeenCalledWith(null);
  });

  it("should continue with the picked second parent", async () => {
    const screen = await renderDialog();
    await pickSecondParent(screen);

    await screen.getByRole("button", { name: "Continue" }).click();

    expect(screen.onContinue).toHaveBeenCalledWith(SECOND);
  });

  it("should cancel when the user backs out", async () => {
    const screen = await renderDialog();

    await screen.getByRole("button", { name: "Cancel" }).click();

    expect(screen.onCancel).toHaveBeenCalled();
  });
});
