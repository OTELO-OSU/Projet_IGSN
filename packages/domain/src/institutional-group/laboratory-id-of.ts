import { findLaboratory } from "./find-laboratory.ts";
import { type Laboratory, LABORATORIES } from "./laboratory.ts";

export function laboratoryIdOf(
  code: string,
  laboratories: readonly Laboratory[] = LABORATORIES,
): string {
  return findLaboratory(code, laboratories)?.id ?? code;
}
