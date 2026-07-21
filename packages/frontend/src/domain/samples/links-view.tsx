import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";
import type { SampleLink } from "@projet-igsn/domain/sample/link/model";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Download } from "lucide-react";

import { m } from "#/paraglide/messages.js";

// The download href must be the browser-facing api URL even when rendered
// during SSR: the SSR-side API_URL (see api.ts) is an internal host the
// reader's browser cannot reach, and it would leak into the HTML.
const publicApiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3002";

const attachmentUrl = (igsn: string, attachmentId: string) =>
  `${publicApiUrl.replace(/\/$/, "")}/samples/${igsn}/attachments/${attachmentId}`;

type LinksViewProps = {
  igsn: string;
  links: SampleLink[];
  attachments: SampleAttachment[];
};

// The Links section of the sample detail page: the related DOI links, opening
// in a new tab, then the attached files, each with a download button (the
// public download route needs no auth, so a plain anchor does).
export function LinksView({ igsn, links, attachments }: LinksViewProps) {
  return (
    <div className="mt-2 grid gap-6">
      {links.length > 0 ? (
        <div>
          <h3 className="text-muted-foreground px-4 pt-3 font-medium">
            {m.sample_links_doi()}
          </h3>
          <ul className="divide-y">
            {links.map((link) => (
              <li key={link.id} className="grid gap-1 px-4 py-3">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium break-all text-sky-800 underline"
                >
                  {link.url}
                </a>
                {link.description ? (
                  // Block paragraph, line breaks preserved: descriptions are
                  // entered in a textarea and can run long.
                  <p className="text-muted-foreground whitespace-pre-line">
                    {link.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div>
          <h3 className="text-muted-foreground px-4 pt-3 font-medium">
            {m.sample_links_attachments()}
          </h3>
          <ul className="divide-y">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="grid gap-1 px-4 py-3">
                <div className="flex items-center gap-4">
                  <span className="flex-1 font-medium break-all">
                    {attachment.name}
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={attachmentUrl(igsn, attachment.id)}
                      download={attachment.name}
                      aria-label={m.sample_attachment_download_name({
                        name: attachment.name,
                      })}
                    >
                      <Download aria-hidden />
                      {m.sample_attachment_download()}
                    </a>
                  </Button>
                </div>
                {attachment.description ? (
                  // Block paragraph, line breaks preserved: descriptions are
                  // entered in a textarea and can run long.
                  <p className="text-muted-foreground whitespace-pre-line">
                    {attachment.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
