import type { CompilerOptions } from "@inlang/paraglide-js";

export const paraglideOptions: CompilerOptions = {
  project: "./project.inlang",
  outdir: "./src/paraglide",
  // locale-modules bundles ~1 file per locale; message-modules emits one per
  // message (~800 here), which stalls the cold dev server (all module requests
  // pending) until the transform cache warms.
  outputStructure: "locale-modules",
  cookieName: "PARAGLIDE_LOCALE",
  strategy: ["url", "cookie", "preferredLanguage", "baseLocale"],
  urlPatterns: [
    { pattern: "", localized: [["en", "/en"]] },
    { pattern: "/search", localized: [["en", "/en/search"]] },
    { pattern: "/samples/:igsn", localized: [["en", "/en/samples/:igsn"]] },
  ],
};
