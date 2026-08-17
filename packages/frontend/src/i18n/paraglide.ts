import type { CompilerOptions } from "@inlang/paraglide-js";

export const paraglideOptions: CompilerOptions = {
  project: "./project.inlang",
  outdir: "./src/paraglide",
  outputStructure: "locale-modules",
  cookieName: "PARAGLIDE_LOCALE",
  strategy: ["url", "cookie", "preferredLanguage", "baseLocale"],
  urlPatterns: [
    { pattern: "", localized: [["en", "/en"]] },
    { pattern: "/search", localized: [["en", "/en/search"]] },
    { pattern: "/samples/:igsn", localized: [["en", "/en/samples/:igsn"]] },
  ],
};
