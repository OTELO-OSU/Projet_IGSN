import { render } from "vitest-browser-react";

import { AuthGate } from "./auth-gate";

const auth = { isLoading: false, error: undefined, isAuthenticated: false };
vi.mock("react-oidc-context", () => ({ useAuth: () => auth }));

describe("AuthGate", () => {
  it("shows the sign-in button when unauthenticated", async () => {
    const screen = await render(<AuthGate />);
    await expect
      .element(screen.getByRole("button", { name: "Sign in with Keycloak" }))
      .toBeInTheDocument();
  });
});
