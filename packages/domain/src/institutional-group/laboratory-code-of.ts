import { LABORATORIES } from "./laboratory.ts";

export function laboratoryCodeOf(id: string): string {
  return LABORATORIES.find((laboratory) => laboratory.id === id)?.code ?? id;
}
