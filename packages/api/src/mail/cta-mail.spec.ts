import { describe, expect, it } from "vitest";

import { ctaMail } from "./cta-mail.ts";

describe("ctaMail", () => {
  it("should escape html carried by the subject and the body", async () => {
    const mail = await ctaMail({
      recipient: { name: null, firstname: null },
      subject: "<script>alert(1)</script>",
      body: "<img src=x onerror=alert(2)>",
      cta: "Open the registry",
      url: "https://example.com/",
    });

    expect(mail.html).not.toContain("<script>alert(1)</script>");
    expect(mail.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(mail.html).not.toContain("<img src=x onerror=alert(2)>");
    expect(mail.html).toContain("&lt;img src=x onerror=alert(2)&gt;");
  });
});
