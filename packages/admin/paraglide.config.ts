import type { CompilerOptions } from "@inlang/paraglide-js";

export const paraglideOptions: CompilerOptions = {
  project: "./project.inlang",
  outdir: "./src/paraglide",
  // message-modules emits one file per message (~1k here), which stalls the
  // cold dev server until the transform cache warms; locale-modules emits ~1.
  outputStructure: "locale-modules",
  strategy: ["baseLocale"],
};
