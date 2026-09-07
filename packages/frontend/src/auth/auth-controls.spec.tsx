import { vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { ADMIN_URL } from "#/admin-url.ts";

import { stubAuth } from "../../test/stub-auth.tsx";
import { AuthControls } from "./auth-controls.tsx";

describe("AuthControls", () => {
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
});
