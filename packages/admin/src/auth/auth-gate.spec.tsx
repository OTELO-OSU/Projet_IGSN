import { SIGN_OUT_BROADCAST_KEY } from "@projet-igsn/domain/auth/sign-out-broadcast";
import {
  markSignedOut,
  readSignedOut,
} from "@projet-igsn/domain/auth/signed-out";
import { StrictMode } from "react";
import { render } from "vitest-browser-react";

import { AuthGate } from "./auth-gate";

const auth = {
  isLoading: false,
  error: undefined as Error | undefined,
  isAuthenticated: false,
  user: undefined as
    | { profile: { identity_provider?: string }; url_state?: string }
    | undefined,
  signinRedirect: vi.fn(),
  signoutRedirect: vi.fn(),
  removeUser: vi.fn(() => {
    auth.isAuthenticated = false;
    auth.user = undefined;
    return Promise.resolve();
  }),
};
vi.mock("react-oidc-context", () => ({ useAuth: () => auth }));

vi.mock("./identity-gate.tsx", () => ({
  IdentityGate: ({
    isOrcid,
    onSignOut,
  }: {
    isOrcid: boolean;
    onSignOut: () => void;
  }) => (
    <>
      <p role="alert">{isOrcid ? "orcid access gate" : "account gate"}</p>
      <button type="button" onClick={onSignOut}>
        Sign out
      </button>
    </>
  ),
}));

const initialUrl = window.location.href;

beforeEach(() => {
  auth.isLoading = false;
  auth.error = undefined;
  auth.isAuthenticated = false;
  auth.user = undefined;
  sessionStorage.clear();
  localStorage.removeItem(SIGN_OUT_BROADCAST_KEY);
  vi.clearAllMocks();
});

afterEach(() => history.replaceState(null, "", initialUrl));

describe("AuthGate", () => {
  it("should announce that it is busy while the session is restored", async () => {
    auth.isLoading = true;
    const screen = await render(<AuthGate />);

    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent(/loading/i);
  });

  it("should report an authentication failure as an alert", async () => {
    auth.error = new Error("network down");
    const screen = await render(<AuthGate />);

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent(/network down/i);
  });

  it("should redirect to the SSO with the visited path when no session is restored", async () => {
    await render(<AuthGate />);

    await vi.waitFor(() =>
      expect(auth.signinRedirect).toHaveBeenCalledWith({
        nonce: expect.any(String),
        url_state: window.location.pathname + window.location.search,
      }),
    );
  });

  it("should start a single redirect when React mounts the gate twice", async () => {
    await render(
      <StrictMode>
        <AuthGate />
      </StrictMode>,
    );

    await vi.waitFor(() => expect(auth.signinRedirect).toHaveBeenCalled());
    expect(auth.signinRedirect).toHaveBeenCalledTimes(1);
  });

  it("should mark the tab signed out when the user signs out", async () => {
    auth.isAuthenticated = true;
    auth.user = { profile: {} };
    const screen = await render(<AuthGate />);

    await screen.getByRole("button", { name: "Sign out" }).click();

    expect(auth.signoutRedirect).toHaveBeenCalledTimes(1);
    expect(readSignedOut()).toBe(true);
    expect(localStorage.getItem(SIGN_OUT_BROADCAST_KEY)).not.toBeNull();
  });

  it("should not sign back in when the sign-out clears the session", async () => {
    auth.isAuthenticated = true;
    auth.user = { profile: {} };
    const screen = await render(<AuthGate />);

    await screen.getByRole("button", { name: "Sign out" }).click();
    auth.isAuthenticated = false;
    auth.user = undefined;
    await screen.rerender(<AuthGate />);

    await expect
      .element(screen.getByRole("button", { name: "Sign in" }))
      .toBeEnabled();
    expect(auth.signinRedirect).not.toHaveBeenCalled();
  });

  it("should wait for an explicit sign-in after the user signed out", async () => {
    markSignedOut();
    const screen = await render(<AuthGate />);

    await expect
      .element(screen.getByRole("button", { name: "Sign in" }))
      .toBeEnabled();
    expect(auth.signinRedirect).not.toHaveBeenCalled();

    await screen.getByRole("button", { name: "Sign in" }).click();

    expect(auth.signinRedirect).toHaveBeenCalledTimes(1);
  });

  it("should show the sign-in button without redirecting when another tab broadcasts a sign-out", async () => {
    auth.isAuthenticated = true;
    auth.user = { profile: {} };
    const screen = await render(<AuthGate />);

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: SIGN_OUT_BROADCAST_KEY,
        newValue: "x",
      }),
    );

    await expect
      .element(screen.getByRole("button", { name: "Sign in" }))
      .toBeEnabled();
    expect(auth.removeUser).toHaveBeenCalledTimes(1);
    expect(auth.signinRedirect).not.toHaveBeenCalled();
    expect(readSignedOut()).toBe(true);
  });

  it("should send a reader back once to the frontend page they signed in from", async () => {
    auth.isAuthenticated = true;
    auth.user = { profile: {}, url_state: "/samples/x" };
    history.replaceState(null, "", "/admin/auth/callback");
    const navigate = vi.fn();

    const screen = await render(
      <StrictMode>
        <AuthGate base="/admin/" navigate={navigate} />
      </StrictMode>,
    );

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/samples/x"));
    expect(navigate).toHaveBeenCalledTimes(1);
    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent(/loading/i);
  });

  it("should open the admin app when the sign-in came from an admin page", async () => {
    auth.isAuthenticated = true;
    auth.user = { profile: {}, url_state: "/admin/users" };
    history.replaceState(null, "", "/admin/auth/callback");
    const navigate = vi.fn();

    const screen = await render(
      <AuthGate base="/admin/" navigate={navigate} />,
    );

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent(/account gate/i);
    expect(navigate).not.toHaveBeenCalled();
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
