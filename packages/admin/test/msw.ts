import { HttpResponse, http } from "msw";
import { setupWorker } from "msw/browser";

export const worker = setupWorker(
  http.post("*/admin/samples/duplicates", () =>
    HttpResponse.json({ data: [] }),
  ),
);
