// The upload hook talks XHR (fetch has no upload progress); this fake records
// each instance and lets a test drive progress and completion by hand.
export class FakeXhr {
  static instances: FakeXhr[] = [];
  upload: {
    onprogress:
      | ((event: {
          lengthComputable: boolean;
          loaded: number;
          total: number;
        }) => void)
      | null;
  } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  status = 0;
  url = "";
  body: FormData | null = null;
  open(_method: string, url: string) {
    this.url = url;
  }
  setRequestHeader() {}
  send(body: FormData) {
    this.body = body;
    FakeXhr.instances.push(this);
  }
  // On success the upload hook parses the created attachment from the
  // response, so a finished upload needs a valid body; the default builds one
  // from the sent form data.
  finish(status = 201, responseText?: string) {
    this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 2 });
    this.status = status;
    const file = this.body?.get("file") as File | null;
    this.responseText =
      responseText ??
      JSON.stringify({
        data: {
          id: crypto.randomUUID(),
          name: file?.name ?? "file.bin",
          mediaType: file?.type || "application/octet-stream",
          description: this.body?.get("description") ?? null,
        },
      });
    this.onload?.();
  }
  responseText = "";
}
