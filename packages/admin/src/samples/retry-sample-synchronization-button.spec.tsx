import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { render } from "vitest-browser-react";

import { worker } from "../../test/msw.ts";
import { RetrySampleSynchronizationButton } from "./retry-sample-synchronization-button.tsx";

const SAMPLE_ID = "01K072TVWVFK5A1RRZ5MY4PPK9";

describe("RetrySampleSynchronizationButton", () => {
  it("should requeue the sample and confirm it", async () => {
    const retried: string[] = [];
    worker.use(
      http.post("*/admin/samples/:id/retry-synchronization", ({ params }) => {
        retried.push(String(params.id));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const screen = await render(
      <QueryClientProvider client={new QueryClient()}>
        <RetrySampleSynchronizationButton sampleId={SAMPLE_ID} />
        <Toaster />
      </QueryClientProvider>,
    );

    await screen.getByRole("button", { name: "Retry synchronization" }).click();

    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("Sample queued for synchronization.");
    expect(retried).toEqual([SAMPLE_ID]);
  });
});
