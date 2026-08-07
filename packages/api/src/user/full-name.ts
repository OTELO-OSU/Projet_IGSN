import type { User } from "@projet-igsn/domain/user/model";

export const fullName = ({
  name,
  firstname,
}: Pick<User, "name" | "firstname">): string =>
  [firstname, name].filter(Boolean).join(" ");
