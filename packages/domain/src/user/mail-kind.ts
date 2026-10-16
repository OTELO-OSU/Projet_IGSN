import { z } from "zod";

export const MAIL_KINDS = [
  "sample_publication",
  "sample_deleted",
  "sample_moderated",
  "sub_sample_declared",
  "sample_invitation",
  "sample_removal",
  "account_approved",
  "manual_group_invitation",
  "pending_users_digest",
] as const;

export const mailKindSchema = z.enum(MAIL_KINDS);
export type MailKind = z.infer<typeof mailKindSchema>;
