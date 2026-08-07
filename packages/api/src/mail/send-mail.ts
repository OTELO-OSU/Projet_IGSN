import nodemailer from "nodemailer";

export type SmtpTransportOptions = {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  auth?: { user: string; pass?: string };
};

export type Mail = {
  to: string[];
  subject: string;
  text: string;
  html: string;
};

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

export function createSendMail(env: NodeJS.ProcessEnv = process.env): SendMail {
  const transport = nodemailer.createTransport(smtpTransportOptions(env));
  return async ({ to, subject, text, html }) => {
    await transport.sendMail({ from: env.SMTP_FROM, to, subject, text, html });
  };
}
