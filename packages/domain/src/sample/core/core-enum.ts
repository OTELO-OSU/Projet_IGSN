import { z } from "zod";

export type CoreEnum<T extends string> = {
  schema: z.ZodType<string>;
  toCore: (value: T) => string;
  fromCore: (value: string) => T;
};

export function coreEnum<T extends string>(
  values: readonly T[],
  format: (value: T) => string,
): CoreEnum<T> {
  const byCore = new Map(values.map((value) => [format(value), value]));
  return {
    schema: z.enum([...byCore.keys()] as [string, ...string[]]).meta({
      description: "Our own code, spelled the IGSN Core way.",
    }),
    toCore: format,
    fromCore: (value) => byCore.get(value) as T,
  };
}

export const toPascalCase = (code: string): string =>
  code.replace(/(?:^|_)(\w)/g, (_match, letter: string) =>
    letter.toUpperCase(),
  );

export const toCamelCase = (code: string): string =>
  code.replace(/_(\w)/g, (_match, letter: string) => letter.toUpperCase());
