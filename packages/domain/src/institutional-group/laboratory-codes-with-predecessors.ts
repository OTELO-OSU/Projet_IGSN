import { findLaboratory } from "./find-laboratory.ts";
import { type Laboratory, LABORATORIES } from "./laboratory.ts";

export function laboratoryCodesWithPredecessors(
  code: string,
  laboratories: readonly Laboratory[] = LABORATORIES,
): string[] {
  const laboratory = findLaboratory(code, laboratories);
  if (laboratory === undefined) return [code];

  return [
    laboratory.code,
    ...laboratories
      .filter(({ replacedBy }) => replacedBy === laboratory.id)
      .flatMap((predecessor) =>
        laboratoryCodesWithPredecessors(predecessor.code, laboratories),
      ),
  ];
}
