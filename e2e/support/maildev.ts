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
      const prefixed = `[IGSN-Dashboard] ${subject}`;
      let mail: Mail | undefined;
      await expect
        .poll(
          async () => {
            mail = (await mailsTo(recipient)).find(
              (candidate) =>
                candidate.subject === prefixed &&
                contents.every((content) => candidate.text.includes(content)),
            );
            return mail;
          },
          {
            message: `"${prefixed}" to ${recipient} holding ${contents.join(", ")}`,
          },
        )
        .toBeDefined();
      if (replyTo !== undefined) {
        expect(mail?.replyTo?.map(({ address }) => address)).toContain(replyTo);
      }
      return mail?.text ?? "";
    },
  };
}
