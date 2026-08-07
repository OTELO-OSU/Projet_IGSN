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
});
