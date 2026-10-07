import type { vi } from "vitest";

export const sentMails = (sendMail: ReturnType<typeof vi.fn>) =>
  sendMail.mock.calls
    .map(([mail]) => ({ to: mail.to, subject: mail.subject }))
    .sort((a, b) => a.to[0].localeCompare(b.to[0]));
