import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import { HttpResponse, http } from "msw";
import { vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { fakeCurrentUser } from "../../test/fake-current-user.ts";
import { worker } from "../../test/msw.ts";
import { render } from "../../test/render.tsx";
import { CharterGate } from "./charter-gate.tsx";

vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ user: { access_token: "tok" } }),
}));

const TITLE = "IGSN-CNRS Terms of Use";
const ACCEPT = "I have read and accept these Terms of Use";

const renderGate = () =>
  render(
    <>
      <CharterGate onSignOut={vi.fn()}>
        <p>Sample list</p>
      </CharterGate>
      <Toaster />
    </>,
  );

const readToEnd = async () => {
  await page.getByRole("region", { name: TITLE }).click();
  await userEvent.keyboard("{End}");
};

describe("CharterGate", () => {
  afterEach(() => page.viewport(414, 896));

  it("should hold a user who has not accepted the charter on it", async () => {
    fakeCurrentUser({ charterAccepted: false });

    const screen = await renderGate();

    await expect
      .element(page.getByRole("dialog", { name: TITLE }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: ACCEPT }))
      .toBeDisabled();
    expect(screen.getByText("Sample list").elements()).toHaveLength(0);
  });

  it("should keep the charter open on Escape", async () => {
    fakeCurrentUser({ charterAccepted: false });
    await renderGate();
    await expect
      .element(page.getByRole("dialog", { name: TITLE }))
      .toBeVisible();

    await userEvent.keyboard("{Escape}");

    await expect
      .element(page.getByRole("dialog", { name: TITLE }))
      .toBeVisible();
  });

  it("should let a user who read to the end accept and reach the app", async () => {
    fakeCurrentUser({ charterAccepted: false });
    worker.use(
      http.put("*/admin/currentUser/charter-acceptance", () => {
        fakeCurrentUser();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const screen = await renderGate();
    await expect
      .element(page.getByRole("button", { name: ACCEPT }))
      .toBeDisabled();

    await readToEnd();
    await page.getByRole("button", { name: ACCEPT }).click();

    await expect.element(screen.getByText("Sample list")).toBeVisible();
    expect(page.getByRole("dialog").elements()).toHaveLength(0);
  });

  it("should enable acceptance at once when the charter fits without scrolling", async () => {
    await page.viewport(1280, 8000);
    fakeCurrentUser({ charterAccepted: false });

    await renderGate();

    await expect
      .element(page.getByRole("button", { name: ACCEPT }))
      .toBeEnabled();
  });

  it("should keep the charter open when the acceptance fails", async () => {
    fakeCurrentUser({ charterAccepted: false });
    worker.use(
      http.put(
        "*/admin/currentUser/charter-acceptance",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    await renderGate();
    await expect
      .element(page.getByRole("button", { name: ACCEPT }))
      .toBeDisabled();

    await readToEnd();
    await page.getByRole("button", { name: ACCEPT }).click();

    await expect
      .element(page.getByText("Could not save your acceptance"))
      .toBeVisible();
    await expect
      .element(page.getByRole("dialog", { name: TITLE }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: ACCEPT }))
      .toBeEnabled();
  });

  it("should show the app to a user who accepted the charter", async () => {
    fakeCurrentUser();

    const screen = await renderGate();

    await expect.element(screen.getByText("Sample list")).toBeVisible();
  });

  it("should show the app when the identity call fails", async () => {
    worker.use(
      http.get(
        "*/admin/currentUser",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const screen = await renderGate();

    await expect.element(screen.getByText("Sample list")).toBeVisible();
  });
});
