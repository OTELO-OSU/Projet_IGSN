import { vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { ContactOwnerForm } from "./contact-owner-form.tsx";

const body = {
  name: "Lovelace",
  firstname: "Ada",
  email: "ada@example.org",
  message: "Could I see this sample?",
};

async function fillAndSend(email = body.email) {
  await page.getByLabelText("Name", { exact: true }).fill(body.name);
  await page.getByLabelText("First name").fill(body.firstname);
  await page.getByLabelText("Email address").fill(email);
  await page.getByLabelText("Message").fill(body.message);
  await page.getByRole("button", { name: "Send" }).click();
}

describe("ContactOwnerForm", () => {
  it("should hand the filled message to onSend, leaving the confirmation to the page", async () => {
    const onSend = vi.fn().mockResolvedValue("sent");
    const screen = await render(<ContactOwnerForm onSend={onSend} />);

    await fillAndSend();

    await vi.waitFor(() => expect(onSend).toHaveBeenCalledWith(body));
    await expect.element(screen.getByRole("status")).toHaveTextContent("");
  });

  it("should tell the visitor when the owner cannot be contacted", async () => {
    const screen = await render(
      <ContactOwnerForm onSend={vi.fn().mockResolvedValue("no_recipient")} />,
    );

    await fillAndSend();

    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent("The owner of this record cannot be contacted.");
  });

  it("should show a generic error when sending fails", async () => {
    const screen = await render(
      <ContactOwnerForm onSend={vi.fn().mockRejectedValue(new Error("500"))} />,
    );

    await fillAndSend();

    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent("Something went wrong. Please try again.");
  });

  it("should block the submit and flag the field when the email is invalid", async () => {
    const onSend = vi.fn().mockResolvedValue("sent");
    const screen = await render(<ContactOwnerForm onSend={onSend} />);

    await fillAndSend("not-an-email");

    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("Please enter a valid email address.");
    expect(onSend).not.toHaveBeenCalled();
  });
});
