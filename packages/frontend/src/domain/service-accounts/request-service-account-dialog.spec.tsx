import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { stubAuth } from "../../../test/stub-auth.tsx";
import { RequestServiceAccountDialog } from "./request-service-account-dialog.tsx";

describe("RequestServiceAccountDialog", () => {
  it("should offer the request to a signed-in visitor", async () => {
    const screen = await renderWithRouter(
      stubAuth(<RequestServiceAccountDialog />, { isAuthenticated: true }),
    );

    await expect
      .element(
        screen.getByRole("button", { name: "Ask for a service account" }),
      )
      .toBeInTheDocument();
  });

  it("should render nothing for a signed-out visitor", async () => {
    const screen = await renderWithRouter(
      stubAuth(<RequestServiceAccountDialog />),
    );

    await expect
      .element(
        screen.getByRole("button", { name: "Ask for a service account" }),
      )
      .not.toBeInTheDocument();
  });
});
