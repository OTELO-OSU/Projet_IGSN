import type { render } from "./render.tsx";

type Queries = Pick<Awaited<ReturnType<typeof render>>, "getByRole">;

export async function addFilter(screen: Queries, name: string) {
  await screen.getByRole("button", { name: "Add a filter" }).click();
  await screen
    .getByRole("dialog")
    .getByRole("button", { name, exact: true })
    .click();
}
