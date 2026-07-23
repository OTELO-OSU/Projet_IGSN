import type { CompilerOptions } from "@inlang/paraglide-js";

import { translatedPathnames } from "./translated-pathnames.ts";

export const paraglideOptions: CompilerOptions = {
  project: "./project.inlang",
  outdir: "./src/paraglide",
  // locale-modules bundles ~1 file per locale; message-modules emits one per
  // message (~800 here), which stalls the cold dev server (all module requests
  // pending) until the transform cache warms. See paraglide docs.
  outputStructure: "locale-modules",
  cookieName: "PARAGLIDE_LOCALE",
  strategy: ["url", "cookie", "preferredLanguage", "baseLocale"],
  urlPatterns: translatedPathnames,
};
