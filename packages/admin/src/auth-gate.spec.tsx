import { render } from "vitest-browser-react";

import { AuthGate } from "./auth-gate";

const auth = { isLoading: false, error: undefined, isAuthenticated: false };
vi.mock("react-oidc-context", () => ({ useAuth: () => auth }));

describe("AuthGate", () => {
  it("shows an identity-provider button per broker when unauthenticated", async () => {
    const screen = await render(<AuthGate />);
    await expect
      .element(
        screen.getByRole("button", { name: "Sign in with your institution" }),
      )
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Sign in with ORCID" }))
      .toBeInTheDocument();
  });
});
