import { render } from "vitest-browser-react";

import { AuthGate } from "./auth-gate";

const auth = {
  isLoading: false,
  error: undefined as Error | undefined,
  isAuthenticated: false,
  user: undefined as { profile: { identity_provider?: string } } | undefined,
  signinRedirect: vi.fn(),
  signoutRedirect: vi.fn(),
};
vi.mock("react-oidc-context", () => ({ useAuth: () => auth }));

beforeEach(() => {
  auth.isLoading = false;
  auth.error = undefined;
  auth.isAuthenticated = false;
  auth.user = undefined;
});

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
      .toBeEnabled();
  });

  it("denies app access to a user signed in through ORCID", async () => {
    auth.isAuthenticated = true;
    auth.user = { profile: { identity_provider: "orcid" } };

    const screen = await render(<AuthGate />);
    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent(/do not have access/i);
    await expect
      .element(screen.getByRole("button", { name: "Sign out" }))
      .toBeInTheDocument();
  });
});
