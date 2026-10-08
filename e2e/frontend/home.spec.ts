import { test } from "../support/db";
import { homePage } from "../support/frontend/home.page";

test.describe("home page", () => {
  test("a reader sees the registry counters and learns more about the service", async ({
    page,
  }) => {
    const home = homePage(page);
    await home.goto();

    await home.expectCounters();
    await home.learnMore();
    await home.expectFaq();
  });

  test("a reader starts recording their first samples by signing in", async ({
    page,
  }) => {
    const home = homePage(page);
    await home.goto();

    await home.recordFirstSamples();
  });
});
