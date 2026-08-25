import { type APIRequestContext, expect } from "@playwright/test";

const maildevUrl = process.env.MAILDEV_URL ?? "http://localhost:11080";

type Mail = {
  subject: string;
  text: string;
  to: { address: string }[];
  replyTo?: { address: string }[];
};

export function maildev(request: APIRequestContext) {
  const mailsTo = async (recipient: string): Promise<Mail[]> => {
    const response = await request.get(`${maildevUrl}/email`);
    const mails = (await response.json()) as Mail[];
    return mails.filter((mail) =>
      mail.to.some((addressee) => addressee.address === recipient),
    );
  };

  return {
    expectMail: async (
      recipient: string,
      subject: string,
      contents: string[],
      replyTo?: string,
    ) => {
      await expect
        .poll(async () =>
          (await mailsTo(recipient)).map((mail) => mail.subject),
        )
        .toContain(subject);
      const [mail] = (await mailsTo(recipient)).filter(
        (candidate) => candidate.subject === subject,
      );
      for (const content of contents) {
        expect(mail?.text).toContain(content);
      }
      if (replyTo !== undefined) {
        expect(mail?.replyTo?.map(({ address }) => address)).toContain(replyTo);
      }
    },
  };
}
