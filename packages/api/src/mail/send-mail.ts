import nodemailer from "nodemailer";

export type SmtpTransportOptions = {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  auth?: { user: string; pass?: string };
};

export type MailAudience = "user" | "admin";

export type MailFrom = { name: string; address: string };

export type Mail = {
  to: string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  audience?: MailAudience;
};

export type RenderedMail = Omit<Mail, "to" | "audience">;

export type SendMail = (mail: Mail) => Promise<void>;

export function smtpTransportOptions(
  env: NodeJS.ProcessEnv,
): SmtpTransportOptions {
  const host = env.SMTP_HOST;
  if (!host) throw new Error("SMTP_HOST is required to send mail");

  const port = Number(env.SMTP_PORT) || 587;
  const user = env.SMTP_USER;
  return {
    host,
    port,
    secure: port === 465,
    requireTLS: !!user,
    auth: user ? { user, pass: env.SMTP_PASSWORD } : undefined,
  };
}

export function mailFrom(
  env: NodeJS.ProcessEnv,
  audience: MailAudience = "user",
): MailFrom {
  const name =
    audience === "admin"
      ? env.SMTP_FROM_NAME_ADMIN || "No-reply"
      : env.SMTP_FROM_NAME || "IGSN";
  return { name, address: env.SMTP_FROM ?? "" };
}

export function createSendMail(env: NodeJS.ProcessEnv = process.env): SendMail {
  const transport = nodemailer.createTransport(smtpTransportOptions(env));
  return async ({ to, subject, text, html, replyTo, audience }) => {
    await transport.sendMail({
      from: mailFrom(env, audience),
      to,
      subject,
      text,
      html,
      replyTo,
    });
  };
}
