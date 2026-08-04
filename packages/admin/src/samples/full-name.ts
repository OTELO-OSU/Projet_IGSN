import type { User } from "@projet-igsn/domain/user/model";

export const fullName = ({
  firstname,
  name,
}: Pick<User, "firstname" | "name">): string =>
  [firstname, name].filter(Boolean).join(" ");
