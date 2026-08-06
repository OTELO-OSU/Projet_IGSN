import { describe, expect, it } from "vitest";

import { createSendMail } from "./send-mail.ts";

const env = {
  SMTP_HOST: "maildev",
  SMTP_PORT: "1025",
  SMTP_FROM: "postmaster@igsn.localhost",
};

describe("createSendMail", () => {
  it("should build a sender from the SMTP environment", () => {
    expect(createSendMail(env)).toBeInstanceOf(Function);
  });

  it("should build a sender when the provider needs credentials", () => {
    expect(
      createSendMail({
        ...env,
        SMTP_PORT: "587",
        SMTP_USER: "apikey",
        SMTP_PASSWORD: "secret",
      }),
    ).toBeInstanceOf(Function);
  });

  it.each([
    { missing: "SMTP_HOST", env: { ...env, SMTP_HOST: "" } },
    { missing: "SMTP_FROM", env: { ...env, SMTP_FROM: undefined } },
    { missing: "a numeric SMTP_PORT", env: { ...env, SMTP_PORT: "smtp" } },
  ])("should refuse to boot without $missing", ({ env: broken }) => {
    expect(() => createSendMail(broken)).toThrow();
  });
});
