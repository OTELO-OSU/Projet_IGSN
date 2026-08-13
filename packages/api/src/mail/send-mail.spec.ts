import { describe, expect, it, vi } from "vitest";

import { createSendMail, mailFrom, smtpTransportOptions } from "./send-mail.ts";

const { sentMail } = vi.hoisted(() => ({ sentMail: vi.fn() }));

vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail: sentMail }) },
}));

describe("smtpTransportOptions", () => {
  it.each([
    {
      what: "anonymous SMTP on the dev maildev port",
      env: { SMTP_HOST: "maildev", SMTP_PORT: "1025" },
      options: {
        host: "maildev",
        port: 1025,
        secure: false,
        requireTLS: false,
        auth: undefined,
      },
    },
    {
      what: "STARTTLS on 587 when the provider needs credentials",
      env: {
        SMTP_HOST: "smtp-relay.example.org",
        SMTP_USER: "apikey",
        SMTP_PASSWORD: "secret",
      },
      options: {
        host: "smtp-relay.example.org",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user: "apikey", pass: "secret" },
      },
    },
    {
      what: "implicit TLS on 465",
      env: { SMTP_HOST: "smtp-relay.example.org", SMTP_PORT: "465" },
      options: {
        host: "smtp-relay.example.org",
        port: 465,
        secure: true,
        requireTLS: false,
        auth: undefined,
      },
    },
    {
      what: "the 587 default on an unusable SMTP_PORT",
      env: { SMTP_HOST: "smtp-relay.example.org", SMTP_PORT: "" },
      options: {
        host: "smtp-relay.example.org",
        port: 587,
        secure: false,
        requireTLS: false,
        auth: undefined,
      },
    },
    {
      what: "anonymous SMTP when SMTP_USER is set but empty",
      env: { SMTP_HOST: "maildev", SMTP_PORT: "1025", SMTP_USER: "" },
      options: {
        host: "maildev",
        port: 1025,
        secure: false,
        requireTLS: false,
        auth: undefined,
      },
    },
  ])("should use $what", ({ env, options }) => {
    expect(smtpTransportOptions(env)).toEqual(options);
  });

  it.each([{}, { SMTP_HOST: "" }])(
    "should refuse to boot without an SMTP host: %o",
    (env) => {
      expect(() => smtpTransportOptions(env)).toThrow("SMTP_HOST");
    },
  );
});

describe("mailFrom", () => {
  it.each([
    {
      what: "IGSN by default for a user mail",
      env: { SMTP_FROM: "postmaster@igsn.localhost" },
      audience: undefined,
      from: { name: "IGSN", address: "postmaster@igsn.localhost" },
    },
    {
      what: "No-reply by default for an admin mail",
      env: { SMTP_FROM: "postmaster@igsn.localhost" },
      audience: "admin" as const,
      from: { name: "No-reply", address: "postmaster@igsn.localhost" },
    },
    {
      what: "the configured user name",
      env: {
        SMTP_FROM: "postmaster@igsn.localhost",
        SMTP_FROM_NAME: "IGSN France",
      },
      audience: "user" as const,
      from: { name: "IGSN France", address: "postmaster@igsn.localhost" },
    },
    {
      what: "the configured admin name",
      env: {
        SMTP_FROM: "postmaster@igsn.localhost",
        SMTP_FROM_NAME_ADMIN: "IGSN robot",
      },
      audience: "admin" as const,
      from: { name: "IGSN robot", address: "postmaster@igsn.localhost" },
    },
    {
      what: "the default name when the configured one is empty",
      env: { SMTP_FROM: "postmaster@igsn.localhost", SMTP_FROM_NAME: "" },
      audience: "user" as const,
      from: { name: "IGSN", address: "postmaster@igsn.localhost" },
    },
    {
      what: "an empty address when no sender is configured",
      env: {},
      audience: "user" as const,
      from: { name: "IGSN", address: "" },
    },
  ])("should send as $what", ({ env, audience, from }) => {
    expect(mailFrom(env, audience)).toEqual(from);
  });
});

describe("createSendMail", () => {
  it("should post the mail from the configured sender", async () => {
    const sendMail = createSendMail({
      SMTP_HOST: "maildev",
      SMTP_PORT: "1025",
      SMTP_FROM: "postmaster@igsn.localhost",
    });

    await sendMail({
      to: ["admin@univ-lorraine.fr", "boss@univ-lorraine.fr"],
      subject: "2 users are waiting for validation",
      text: "2 users are waiting for validation",
      html: "<p>2 users are waiting for validation</p>",
      audience: "admin",
    });

    expect(sentMail).toHaveBeenCalledWith({
      from: { name: "No-reply", address: "postmaster@igsn.localhost" },
      to: ["admin@univ-lorraine.fr", "boss@univ-lorraine.fr"],
      subject: "2 users are waiting for validation",
      text: "2 users are waiting for validation",
      html: "<p>2 users are waiting for validation</p>",
    });
  });
});
