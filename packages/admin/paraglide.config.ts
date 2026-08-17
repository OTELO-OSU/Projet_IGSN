import type { CompilerOptions } from "@inlang/paraglide-js";

export const paraglideOptions: CompilerOptions = {
  project: "./project.inlang",
  outdir: "./src/paraglide",
  outputStructure: "locale-modules",
  strategy: ["baseLocale"],
};
