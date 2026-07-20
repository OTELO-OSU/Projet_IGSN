import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";

// RFC 6266 headers: an ASCII fallback filename plus the UTF-8 filename*.
// Always a plain download, never rendered inline: the media type is
// client-declared at upload, so the browser must not execute it (svg, html).
export function attachmentDownload(
  attachment: SampleAttachment,
  content: Uint8Array,
): Response {
  const fallback = attachment.name
    .replace(/[^\x20-\x7e]/g, "_")
    .replaceAll('"', "_");
  return new Response(content, {
    headers: {
      "Content-Type": attachment.mediaType,
      "Content-Disposition": `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
