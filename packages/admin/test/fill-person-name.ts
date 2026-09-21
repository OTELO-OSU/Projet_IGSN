import type { render } from "./render.tsx";

type Queries = Pick<Awaited<ReturnType<typeof render>>, "getByRole">;

export const FREE_TEXT_ACTION = "Not in the list? Enter a name";

export async function fillPersonName(
  screen: Queries,
  person: string,
  firstname: string,
  lastname: string,
) {
  const group = screen.getByRole("group", { name: person });
  await group.getByRole("combobox", { name: person }).click();
  await screen.getByRole("option", { name: FREE_TEXT_ACTION }).click();
  await group.getByRole("textbox", { name: /first name/i }).fill(firstname);
  await group.getByRole("textbox", { name: /last name/i }).fill(lastname);
}
