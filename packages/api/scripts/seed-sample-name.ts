const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const letterAt = (block: number, place: number) =>
  LETTERS[Math.floor(block / LETTERS.length ** place) % LETTERS.length];

export function seedSampleName(index: number): string {
  const block = Math.floor(index / 1000);
  const digits = String(index % 1000).padStart(3, "0");
  return `${letterAt(block, 3)}${letterAt(block, 2)}-${digits}-${letterAt(block, 1)}${letterAt(block, 0)}`;
}

const NAME_SPACE = LETTERS.length ** 4 * 1000;
const SCATTER = 282_426_701;

export function scatteredSeedSampleName(index: number): string {
  return seedSampleName((index * SCATTER) % NAME_SPACE);
}
