import { type Laboratory, LABORATORIES } from "./laboratory.ts";

export function findLaboratory(
  code: string,
  laboratories: readonly Laboratory[] = LABORATORIES,
): Laboratory | undefined {
  return laboratories.find(
    (laboratory) =>
      laboratory.code === code || laboratory.formerCodes?.includes(code),
  );
}
