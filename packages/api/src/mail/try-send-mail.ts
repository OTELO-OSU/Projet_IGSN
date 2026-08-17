import type { RenderedMail, SendMail } from "./send-mail.ts";

export async function trySendMail(
  to: string,
  render: () => Promise<RenderedMail>,
  sendMail: SendMail,
  failure: string,
): Promise<void> {
  try {
    await sendMail({ to: [to], ...(await render()) });
  } catch (error: unknown) {
    console.error(failure, error);
  }
}
