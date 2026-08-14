import { describe, expect, it } from "vitest";

import { userAcceptedMail } from "./user-accepted-mail.ts";

const ADMIN_URL = "http://localhost:3001/";

describe("userAcceptedMail", () => {
  it("should greet the user by name and link the registry", async () => {
    const mail = await userAcceptedMail(
      { name: "Dupont", firstname: "Marie" },
      ADMIN_URL,
    );

    expect(mail.subject).toBe("Your account has been activated");
    expect(mail.text).toContain("Hello Marie Dupont,");
    expect(mail.text).toContain(ADMIN_URL);
    expect(mail.html).toContain("Marie Dupont");
    expect(mail.html).toContain(ADMIN_URL);
  });

  it("should fall back to a plain greeting when the name is unknown", async () => {
    const mail = await userAcceptedMail(
      { name: null, firstname: null },
      ADMIN_URL,
    );

    expect(mail.text).toContain("Hello,");
    expect(mail.html).toContain("Hello,");
  });

  it("should escape html carried by the name", async () => {
    const mail = await userAcceptedMail(
      { name: "<b>Dupont</b>", firstname: null },
      ADMIN_URL,
    );

    expect(mail.html).not.toContain("<b>Dupont</b>");
    expect(mail.html).toContain("&lt;b&gt;Dupont&lt;/b&gt;");
  });
});
