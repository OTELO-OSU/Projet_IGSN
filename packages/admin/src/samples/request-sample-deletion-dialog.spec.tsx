import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import { TooltipProvider } from "@projet-igsn/design-system/components/ui/tooltip";
import { HttpResponse, http } from "msw";
import { vi } from "vitest";

import { fakeSample } from "../../test/fake-sample.ts";
import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { RequestSampleDeletionDialog } from "./request-sample-deletion-dialog.tsx";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    user: { access_token: "tok", profile: { name: "Marie Dupont" } },
  }),
}));

function fakeApi() {
  const reasons: string[] = [];
  worker.use(
    http.post("*/samples/:id/deletion-request", async ({ request }) => {
      const body = (await request.json()) as { reason: string };
      reasons.push(body.reason);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return reasons;
}

async function openDialog() {
  const reasons = fakeApi();
  const screen = await render(
    <TooltipProvider>
      <RequestSampleDeletionDialog sampleId={fakeSample.id} />
      <Toaster />
    </TooltipProvider>,
  );
  await screen.getByRole("button", { name: "Request deletion" }).click();
  return { screen, reasons };
}

describe("RequestSampleDeletionDialog", () => {
  it("should send no request until a justification is typed", async () => {
    const { screen, reasons } = await openDialog();

    await screen.getByRole("button", { name: "Submit request" }).click();

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("Explain why this sample should be deleted.");
    expect(reasons).toEqual([]);
  });

  it("should close the dialog and confirm the request was sent", async () => {
    const { screen, reasons } = await openDialog();

    await screen
      .getByLabelText("Why do you want to delete this sample?")
      .fill("The sample was destroyed by mistake.");
    await screen.getByRole("button", { name: "Submit request" }).click();

    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent(
        "Your request was sent to the super admin and is being processed.",
      );
    expect(screen.getByRole("dialog").elements()).toHaveLength(0);
    expect(reasons).toEqual(["The sample was destroyed by mistake."]);
  });

  it("should reopen a blank dialog after a cancelled attempt", async () => {
    const { screen } = await openDialog();
    await screen
      .getByLabelText("Why do you want to delete this sample?")
      .fill("   ");
    await screen.getByRole("button", { name: "Submit request" }).click();
    await expect.element(screen.getByRole("alert")).toBeVisible();

    await screen.getByRole("button", { name: "Cancel" }).click();
    await screen.getByRole("button", { name: "Request deletion" }).click();

    await expect
      .element(screen.getByLabelText("Why do you want to delete this sample?"))
      .toHaveValue("");
    expect(screen.getByRole("alert").elements()).toHaveLength(0);
  });
});
