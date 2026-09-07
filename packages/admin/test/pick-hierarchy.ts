import type { render } from "./render.tsx";

type Queries = Pick<Awaited<ReturnType<typeof render>>, "getByRole">;

async function pickOptions(screen: Queries, options: string[]) {
  for (const option of options) {
    await screen.getByRole("option", { name: option, exact: true }).click();
  }
}

export async function pickPath(
  screen: Queries,
  field: string,
  ...options: string[]
) {
  await screen.getByRole("combobox", { name: field, exact: true }).click();
  await pickOptions(screen, options);
}

export async function repickPath(
  screen: Queries,
  chip: string,
  ...options: string[]
) {
  await screen.getByRole("button", { name: chip, exact: true }).click();
  await pickOptions(screen, options);
}
