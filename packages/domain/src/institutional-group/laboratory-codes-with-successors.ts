import { findLaboratory } from "./find-laboratory.ts";
import { type Laboratory, LABORATORIES } from "./laboratory.ts";

export function laboratoryCodesWithSuccessors(
  code: string,
  laboratories: readonly Laboratory[] = LABORATORIES,
): string[] {
  const laboratory = findLaboratory(code, laboratories);
  const successor = laboratories.find(
    (candidate) => candidate.id === laboratory?.replacedBy,
  );
  return [
    laboratory?.code ?? code,
    ...(successor === undefined
      ? []
      : laboratoryCodesWithSuccessors(successor.code, laboratories)),
  ];
}
