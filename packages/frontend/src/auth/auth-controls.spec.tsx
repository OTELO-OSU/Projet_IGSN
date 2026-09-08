import { SIGN_OUT_BROADCAST_KEY } from "@projet-igsn/domain/auth/sign-out-broadcast";
import { vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { ADMIN_URL } from "#/admin-url.ts";

import { stubAuth } from "../../test/stub-auth.tsx";
import { AuthControls } from "./auth-controls.tsx";

describe("AuthControls", () => {
  beforeEach(() => {
    localStorage.removeItem(SIGN_OUT_BROADCAST_KEY);
  });

  it("should send a signed-out visitor to the provider, recording the page to come back to", async () => {
    const signinRedirect = vi.fn();
    await render(stubAuth(<AuthControls />, { signinRedirect }));

    await page.getByRole("button", { name: "Sign in" }).click();

    expect(signinRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        url_state: window.location.pathname + window.location.search,
        nonce: expect.any(String),
      }),
    );
  });

  it("should offer admin and sign out to a signed-in visitor", async () => {
    const signoutRedirect = vi.fn();
    const screen = await render(
      stubAuth(<AuthControls />, { isAuthenticated: true, signoutRedirect }),
    );

    await expect
      .element(screen.getByRole("link", { name: "Go to admin" }))
      .toHaveAttribute("href", ADMIN_URL);
    await page.getByRole("button", { name: "Sign out" }).click();

    expect(signoutRedirect).toHaveBeenCalled();
  });

  it("should tell the other tabs it signed out", async () => {
    await render(
      stubAuth(<AuthControls />, {
        isAuthenticated: true,
        signoutRedirect: vi.fn(),
      }),
    );

    await page.getByRole("button", { name: "Sign out" }).click();

    expect(localStorage.getItem(SIGN_OUT_BROADCAST_KEY)).not.toBeNull();
  });

  it("should render nothing while the session is loading", async () => {
    const screen = await render(
      stubAuth(<AuthControls />, { isLoading: true }),
    );

    await expect
      .element(screen.getByRole("button", { name: "Sign in" }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Sign out" }))
      .not.toBeInTheDocument();
  });

  it("should keep sign in visible but disabled while the provider redirect runs", async () => {
    const screen = await render(
      stubAuth(<AuthControls />, {
        isLoading: true,
        activeNavigator: "signinRedirect",
      }),
    );

    await expect
      .element(screen.getByRole("button", { name: "Sign in" }))
      .toBeDisabled();
  });

  it.each([
    { key: SIGN_OUT_BROADCAST_KEY, times: 1 },
    { key: "unrelated-key", times: 0 },
  ])(
    "should drop the local session $times time(s) on a storage write to $key",
    async ({ key, times }) => {
      const removeUser = vi.fn();
      await render(
        stubAuth(<AuthControls />, { isAuthenticated: true, removeUser }),
      );

      window.dispatchEvent(new StorageEvent("storage", { key }));

      expect(removeUser).toHaveBeenCalledTimes(times);
    },
  );
});
