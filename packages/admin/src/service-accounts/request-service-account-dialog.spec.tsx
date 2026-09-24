import { HttpResponse, http } from "msw";
import { vi } from "vitest";

import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { RequestServiceAccountDialog } from "./request-service-account-dialog.tsx";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    user: { access_token: "tok", profile: { sub: "jean" } },
  }),
}));

describe("RequestServiceAccountDialog", () => {
  it("should open the request form and close once the request is sent", async () => {
    worker.use(
      http.get("*/admin/currentUser/attachable-manual-groups", () =>
        HttpResponse.json({ data: [] }),
      ),
      http.get("*/admin/currentUser/service-accounts/requestable-groups", () =>
        HttpResponse.json({
          data: { organizations: [], osus: [], laboratories: [] },
        }),
      ),
      http.post(
        "*/admin/currentUser/service-accounts/requests",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const screen = await render(<RequestServiceAccountDialog />);
    const dialog = screen.getByRole("dialog", {
      name: "Ask for a service account",
    });

    await screen
      .getByRole("button", { name: "Ask for a service account" })
      .click();
    await dialog.getByLabelText("Service name").fill("Basalt pipeline");
    await dialog
      .getByLabelText("Why do you need a service account?")
      .fill("Automate our basalt uploads");
    await dialog.getByRole("button", { name: "Send request" }).click();

    await expect.element(dialog).not.toBeInTheDocument();
  });
});
