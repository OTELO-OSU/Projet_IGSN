import type { User } from "oidc-client-ts";

import { renderWithRouter } from "../../test/render-with-router.tsx";
import { stubAuth } from "../../test/stub-auth.tsx";
import { AuthCallback } from "./auth-callback.tsx";

const SAMPLE_ROUTE = "/samples/$igsn";

const user = (url_state: string) => ({ url_state }) as User;

describe("AuthCallback", () => {
  it("should send the visitor back to the page they signed in from", async () => {
    const screen = await renderWithRouter(
      stubAuth(<AuthCallback />, { user: user("/samples/abc") }),
      [SAMPLE_ROUTE],
    );

    await expect.element(screen.getByText(SAMPLE_ROUTE)).toBeInTheDocument();
  });

  it("should not navigate while the code exchange is still running", async () => {
    const screen = await renderWithRouter(
      stubAuth(<AuthCallback />, {
        isLoading: true,
        user: user("/samples/abc"),
      }),
      [SAMPLE_ROUTE],
    );

    await expect
      .element(screen.getByText(SAMPLE_ROUTE))
      .not.toBeInTheDocument();
  });

  it("should show why the sign-in failed instead of navigating", async () => {
    const screen = await renderWithRouter(
      stubAuth(<AuthCallback />, {
        error: Object.assign(new Error("state not found"), {
          source: "unknown" as const,
        }),
      }),
      [SAMPLE_ROUTE],
    );

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("Authentication error: state not found");
  });
});
