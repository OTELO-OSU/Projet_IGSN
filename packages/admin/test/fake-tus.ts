import { HttpResponse, http } from "msw";

import { worker } from "./msw.ts";

type StagedFile = { name: string; length: number; offset: number };

type FakeTusAnswers = {
  post?: () => number | null;
  patch?: (call: number) => number | "lost" | null;
};

const UPLOADS = "*/admin/samples/import/uploads";

const decodeMetadata = (header: string | null): Record<string, string> =>
  Object.fromEntries(
    (header ?? "").split(",").map((pair) => {
      const [key = "", value = ""] = pair.split(" ");
      return [key, atob(value)];
    }),
  );

export function fakeTus({ post, patch }: FakeTusAnswers = {}) {
  const staged = new Map<string, StagedFile>();
  const requests: string[] = [];
  const authorizations: (string | null)[] = [];
  let patches = 0;
  const stagedFile = (id: unknown): StagedFile => {
    const file = staged.get(String(id));
    if (!file) throw new Error(`no staged upload ${String(id)}`);
    return file;
  };
  worker.use(
    http.post(`${UPLOADS}/`, ({ request }) => {
      authorizations.push(request.headers.get("Authorization"));
      const { filename = "", filetype } = decodeMetadata(
        request.headers.get("Upload-Metadata"),
      );
      requests.push(`POST ${filename} ${filetype}`);
      const status = post?.() ?? null;
      if (status !== null) return new HttpResponse(null, { status });
      const id = crypto.randomUUID();
      staged.set(id, {
        name: filename,
        length: Number(request.headers.get("Upload-Length")),
        offset: 0,
      });
      return new HttpResponse(null, {
        status: 201,
        headers: { Location: id, "Tus-Resumable": "1.0.0" },
      });
    }),
    http.head(`${UPLOADS}/:id`, ({ request, params }) => {
      authorizations.push(request.headers.get("Authorization"));
      const file = stagedFile(params.id);
      requests.push(`HEAD ${file.name} ${file.offset}`);
      return new HttpResponse(null, {
        status: 200,
        headers: {
          "Upload-Offset": String(file.offset),
          "Upload-Length": String(file.length),
          "Tus-Resumable": "1.0.0",
        },
      });
    }),
    http.patch(`${UPLOADS}/:id`, async ({ request, params }) => {
      authorizations.push(request.headers.get("Authorization"));
      const file = stagedFile(params.id);
      requests.push(
        `PATCH ${file.name} ${request.headers.get("Upload-Offset")}`,
      );
      patches += 1;
      const answer = patch?.(patches) ?? null;
      if (typeof answer === "number")
        return new HttpResponse(null, { status: answer });
      file.offset += (await request.arrayBuffer()).byteLength;
      if (answer === "lost") return HttpResponse.error();
      return new HttpResponse(null, {
        status: 204,
        headers: {
          "Upload-Offset": String(file.offset),
          "Tus-Resumable": "1.0.0",
        },
      });
    }),
  );
  return {
    requests,
    authorizations,
    idOf: (name: string, nth = 0) =>
      [...staged].filter(([, file]) => file.name === name)[nth]?.[0],
  };
}
