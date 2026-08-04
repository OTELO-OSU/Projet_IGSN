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

// The gate behind an ORCID session; its own spec covers the linked/unlinked
// split, here it only needs to be what an ORCID session renders.
vi.mock("./orcid-access-gate.tsx", () => ({
  OrcidAccessGate: () => <p role="alert">orcid access gate</p>,
}));

beforeEach(() => {
  auth.isLoading = false;
  auth.error = undefined;
  auth.isAuthenticated = false;
  auth.user = undefined;
});

describe("AuthGate", () => {
  it("shows a single sign-in button when unauthenticated", async () => {
    const screen = await render(<AuthGate />);
    await expect
      .element(screen.getByRole("button", { name: "Sign in" }))
      .toBeEnabled();
  });

  it("should start sign-in with a fresh nonce and no broker hint", async () => {
    const screen = await render(<AuthGate />);

    await screen.getByRole("button", { name: "Sign in" }).click();

    expect(auth.signinRedirect).toHaveBeenCalledWith({
      nonce: expect.any(String),
    });
  });

  it.each(["orcid", "ORCID"])(
    "routes a user signed in through ORCID to the ORCID access gate (identity_provider %s)",
    async (alias) => {
      auth.isAuthenticated = true;
      auth.user = { profile: { identity_provider: alias } };

      const screen = await render(<AuthGate />);
      await expect
        .element(screen.getByRole("alert"))
        .toHaveTextContent(/orcid access gate/i);
    },
  );
});
