import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";

export async function attachmentDownload(
  request: Request,
  attachment: SampleAttachment,
  content: ReadableStream<Uint8Array>,
  size: number,
): Promise<Response> {
  const fallback = attachment.name
    .replace(/[^\x20-\x7e]/g, "_")
    .replaceAll('"', "_");
  try {
    const headers = new Headers({
      "Content-Type": attachment.mediaType,
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") {
      await content.cancel();
      return new Response(null, { headers });
    }
    if (request.signal.aborted) await content.cancel();
    else {
      request.signal.addEventListener(
        "abort",
        () => content.cancel().catch(() => {}),
        { once: true },
      );
    }
    return new Response(content, { headers });
  } catch (error) {
    await content.cancel().catch(() => {});
    throw error;
  }
}
