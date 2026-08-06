import nodemailer from "nodemailer";

export type Mail = {
  to: string[];
  subject: string;
  text: string;
  html: string;
};

export type SendMail = (mail: Mail) => Promise<void>;

export function createSendMail(env: NodeJS.ProcessEnv = process.env): SendMail {
  const port = Number(env.SMTP_PORT) || 587;
  const user = env.SMTP_USER || undefined;
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: user !== undefined,
    auth: user ? { user, pass: env.SMTP_PASSWORD } : undefined,
  });
  return async ({ to, subject, text, html }) => {
    await transport.sendMail({ from: env.SMTP_FROM, to, subject, text, html });
  };
}
