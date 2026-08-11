import type { User } from "./model.ts";

export const fullName = ({
  firstname,
  name,
}: Pick<User, "firstname" | "name">): string =>
  [firstname, name].filter(Boolean).join(" ");
