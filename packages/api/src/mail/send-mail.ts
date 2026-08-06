import nodemailer from "nodemailer";
import { z } from "zod";

export type Mail = {
  to: string[];
  subject: string;
  text: string;
  html: string;
};

export type SendMail = (mail: Mail) => Promise<void>;

const smtpConfigSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().default(587),
  from: z.string().min(1),
  user: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
});

export function createSendMail(env: NodeJS.ProcessEnv = process.env): SendMail {
  const config = smtpConfigSchema.parse({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || undefined,
    from: env.SMTP_FROM,
    user: env.SMTP_USER || undefined,
    password: env.SMTP_PASSWORD || undefined,
  });
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.user !== undefined,
    auth: config.user
      ? { user: config.user, pass: config.password }
      : undefined,
  });
  return async ({ to, subject, text, html }) => {
    await transport.sendMail({ from: config.from, to, subject, text, html });
  };
}
