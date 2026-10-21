export function allowsSpecificName(
  material: string | null | undefined,
): boolean {
  return (
    material !== "rock_and_sediment.rock.unknown" &&
    material !== "rock_and_sediment.sediment.unknown"
  );
}
