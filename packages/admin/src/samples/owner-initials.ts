type OwnerName = {
  name: string | null;
  firstname: string | null;
};

export function ownerInitials({ name, firstname }: OwnerName): string {
  return [firstname, name]
    .map((part) => part?.trim().charAt(0).toUpperCase() ?? "")
    .join("");
}
