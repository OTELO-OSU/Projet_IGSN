import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import { page } from "vitest/browser";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { ContactPage } from "./contact-page.tsx";

const body = {
  name: "Lovelace",
  firstname: "Ada",
  email: "ada@example.org",
  message: "How do I declare a meteorite?",
  subject: "Extraterrestrial samples",
};

const answer = (status: number) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(null, { status }));

async function fillAndSend(subject = body.subject) {
  await page.getByLabelText("Subject").fill(subject);
  await page.getByLabelText("Name", { exact: true }).fill(body.name);
  await page.getByLabelText("First name").fill(body.firstname);
  await page.getByLabelText("Email address").fill(body.email);
  await page.getByLabelText("Message").fill(body.message);
  await page.getByRole("button", { name: "Send" }).click();
}

describe("ContactPage", () => {
  it("should post the message to the administrators and confirm it with a toast", async () => {
    const fetch = answer(204);
    await renderWithRouter(
      <>
        <ContactPage />
        <Toaster />
      </>,
    );

    await fillAndSend();

    await expect
      .element(
        page.getByText("Your message has been sent to the administrators."),
      )
      .toBeVisible();
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect([(url as URL).pathname, init?.method]).toEqual([
      "/api/contact",
      "POST",
    ]);
    expect(JSON.parse(init?.body as string)).toEqual(body);
  });

  it("should keep the form and ask the visitor to retry later when rate limited", async () => {
    answer(429);
    const screen = await renderWithRouter(<ContactPage />);

    await fillAndSend();

    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent("Too many messages, try again later.");
    await expect.element(screen.getByRole("form")).toBeInTheDocument();
  });

  it("should require a subject before sending", async () => {
    const fetch = answer(204);
    const screen = await renderWithRouter(<ContactPage />);

    await fillAndSend("");

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("This field is required.");
    expect(fetch).not.toHaveBeenCalled();
  });
});
