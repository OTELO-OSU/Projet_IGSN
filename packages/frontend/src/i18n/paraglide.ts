import type { CompilerOptions } from "@inlang/paraglide-js";

import { translatedPathnames } from "./translated-pathnames.ts";

export const paraglideOptions: CompilerOptions = {
  project: "./project.inlang",
  outdir: "./src/paraglide",
  outputStructure: "message-modules",
  cookieName: "PARAGLIDE_LOCALE",
  strategy: ["url", "cookie", "preferredLanguage", "baseLocale"],
  urlPatterns: translatedPathnames,
};
