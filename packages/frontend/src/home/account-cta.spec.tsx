import { vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { ADMIN_URL } from "#/admin-url.ts";

import { stubAuth } from "../../test/stub-auth.tsx";
import { AccountCta } from "./account-cta.tsx";

describe("AccountCta", () => {
  it("should start the sign in of an anonymous reader, since accounts are created at first sign in", async () => {
    const signinRedirect = vi.fn();
    await render(
      stubAuth(<AccountCta>Record my first samples</AccountCta>, {
        signinRedirect,
      }),
    );

    await page.getByRole("button", { name: "Record my first samples" }).click();

    expect(signinRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        url_state: window.location.pathname + window.location.search,
      }),
    );
  });

  it("should send a signed-in reader to the dashboard", async () => {
    const screen = await render(
      stubAuth(<AccountCta>Record my first samples</AccountCta>, {
        isAuthenticated: true,
      }),
    );

    await expect
      .element(screen.getByRole("link", { name: "Record my first samples" }))
      .toHaveAttribute("href", ADMIN_URL);
  });
});
