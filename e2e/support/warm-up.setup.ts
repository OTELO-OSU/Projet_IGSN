import { test } from "@playwright/test";

import { RESEARCHERS, signInAsResearcher } from "./admin/sign-in";
import { frontendUrl } from "./urls";

test("the stack answers and the shared researcher has signed in once", async ({
  page,
}) => {
  await signInAsResearcher(page, RESEARCHERS.jean);
  await page.goto(frontendUrl);
});
