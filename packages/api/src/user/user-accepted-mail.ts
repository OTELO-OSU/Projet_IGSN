import type { User } from "@projet-igsn/domain/user/model";

import mjml2html from "mjml";
import { readFileSync } from "node:fs";

import { escapeHtml } from "../mail/escape-html.ts";
import { fullName } from "./full-name.ts";

const TEMPLATE = readFileSync(
  new URL("./user-accepted-mail.mjml", import.meta.url),
  "utf8",
);

const SUBJECT = "Your account has been approved";

export async function userAcceptedMail(
  user: Pick<User, "name" | "firstname">,
  adminUrl: string,
): Promise<{ subject: string; text: string; html: string }> {
  const named = fullName(user);
  const greeting = named ? `Hello ${named},` : "Hello,";
  const { html } = await mjml2html(
    TEMPLATE.replaceAll("__TITLE__", SUBJECT)
      .replace("__GREETING__", escapeHtml(greeting))
      .replace("__ADMIN_URL__", escapeHtml(adminUrl)),
  );
  return {
    subject: SUBJECT,
    text: `${greeting}\n\nYour account has been approved. You can now publish samples.\n\nOpen the sample registry: ${adminUrl}\n`,
    html,
  };
}
