import { render } from "vitest-browser-react";

import { HttpError } from "../http-error.ts";
import { OrcidAccessGate } from "./orcid-access-gate.tsx";

const me = {
  data: undefined as { orcid: string | null } | undefined,
  error: null as Error | null,
};
vi.mock("./use-current-user.ts", () => ({ useCurrentUser: () => me }));

beforeEach(() => {
  me.data = undefined;
  me.error = null;
});

describe("OrcidAccessGate", () => {
  it("should deny an ORCID session whose orcid is linked to no account", async () => {
    me.error = new HttpError(403, "Forbidden");
    const onSignOut = vi.fn();

    const screen = await render(
      <OrcidAccessGate onSignOut={onSignOut}>app</OrcidAccessGate>,
    );

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent(/not linked to an account/i);
    await screen.getByRole("button", { name: "Sign out" }).click();
    expect(onSignOut).toHaveBeenCalled();
  });

  it("should let a linked ORCID session through", async () => {
    me.data = { orcid: "0000-0002-1825-0097" };

    const screen = await render(
      <OrcidAccessGate onSignOut={vi.fn()}>app</OrcidAccessGate>,
    );

    await expect.element(screen.getByText("app")).toBeInTheDocument();
  });
});
