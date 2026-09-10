import { HttpResponse, http } from "msw";

import { fakeCurrentUser } from "../test/fake-current-user.ts";
import { worker } from "../test/msw.ts";
import { render } from "../test/render.tsx";
import { UserMenu } from "./user-menu.tsx";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: {
    to: string;
    children?: React.ReactNode;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe("UserMenu", () => {
  it("shows the signed-in user's name", async () => {
    fakeCurrentUser();

    const screen = await render(<UserMenu onSignOut={vi.fn()} />);

    await expect.element(screen.getByText("Marie Dupont")).toBeInTheDocument();
  });

  it("should offer the settings and the sign out once opened", async () => {
    fakeCurrentUser();

    const screen = await render(<UserMenu onSignOut={vi.fn()} />);
    await screen.getByRole("button", { name: /Marie Dupont/ }).click();

    await expect
      .element(screen.getByRole("menuitem", { name: "Settings" }))
      .toHaveAttribute("href", "/settings");
    await expect
      .element(screen.getByRole("menuitem", { name: "Sign out" }))
      .toBeVisible();
  });

  it("should sign the user out when they choose sign out", async () => {
    const onSignOut = vi.fn();
    fakeCurrentUser();

    const screen = await render(<UserMenu onSignOut={onSignOut} />);
    await screen.getByRole("button", { name: /Marie Dupont/ }).click();
    await screen.getByRole("menuitem", { name: "Sign out" }).click();

    await vi.waitFor(() => expect(onSignOut).toHaveBeenCalledTimes(1));
  });

  it("should still offer a way to sign out when the account cannot be loaded", async () => {
    const onSignOut = vi.fn();
    worker.use(
      http.get(
        "*/admin/currentUser",
        () =>
          new HttpResponse(null, {
            status: 500,
          }),
      ),
    );

    const screen = await render(<UserMenu onSignOut={onSignOut} />);
    await screen.getByRole("button", { name: "Sign out" }).click();

    await vi.waitFor(() => expect(onSignOut).toHaveBeenCalledTimes(1));
  });
});
