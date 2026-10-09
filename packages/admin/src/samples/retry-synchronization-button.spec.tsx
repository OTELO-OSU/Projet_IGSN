import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { render } from "vitest-browser-react";

import { worker } from "../../test/msw.ts";
import { RetrySynchronizationButton } from "./retry-synchronization-button.tsx";

function fakeApi(initialFailed: number) {
  let failed = initialFailed;
  worker.use(
    http.get("*/admin/samples", ({ request }) => {
      const synchronizationStatus = new URL(request.url).searchParams.get(
        "synchronizationStatus",
      );
      return HttpResponse.json({
        data: [],
        meta: { total: synchronizationStatus === "failed" ? failed : 0 },
      });
    }),
    http.post("*/admin/samples/retry-synchronization", () => {
      const count = failed;
      failed = 0;
      return HttpResponse.json({ count });
    }),
  );
}

const renderButton = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RetrySynchronizationButton />
      <Toaster />
    </QueryClientProvider>,
  );

describe("RetrySynchronizationButton", () => {
  it("should render nothing when no synchronization failed", async () => {
    fakeApi(0);
    const screen = await renderButton();

    await expect.poll(() => screen.container.textContent).toBe("");
    expect(
      screen.getByRole("button", { name: "Retry synchronization" }).elements(),
    ).toHaveLength(0);
  });

  it("should requeue the failed synchronizations, confirm the count and disappear", async () => {
    fakeApi(2);
    const screen = await renderButton();
    const button = screen.getByRole("button", {
      name: "Retry synchronization",
    });

    await button.click();

    await expect
      .element(screen.getByRole("region", { name: /notifications/i }))
      .toHaveTextContent("2 samples queued for synchronization.");
    await expect.element(button).not.toBeInTheDocument();
  });
});
