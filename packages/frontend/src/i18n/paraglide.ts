import type { CompilerOptions } from "@inlang/paraglide-js";

export const paraglideOptions: CompilerOptions = {
  project: "./project.inlang",
  outdir: "./src/paraglide",
  outputStructure: "locale-modules",
  cookieName: "PARAGLIDE_LOCALE",
  strategy: ["url", "cookie", "preferredLanguage", "baseLocale"],
  urlPatterns: [
    {
      pattern: "",
      localized: [
        ["en", "/en"],
        ["fr", "/fr"],
      ],
    },
    {
      pattern: "/search",
      localized: [
        ["en", "/en/search"],
        ["fr", "/fr/search"],
      ],
    },
    {
      pattern: "/faq",
      localized: [
        ["en", "/en/faq"],
        ["fr", "/fr/faq"],
      ],
    },
    {
      pattern: "/faq/:category",
      localized: [
        ["en", "/en/faq/:category"],
        ["fr", "/fr/faq/:category"],
      ],
    },
    {
      pattern: "/partners",
      localized: [
        ["en", "/en/partners"],
        ["fr", "/fr/partners"],
      ],
    },
    {
      pattern: "/terms-of-use",
      localized: [
        ["en", "/en/terms-of-use"],
        ["fr", "/fr/terms-of-use"],
      ],
    },
    {
      pattern: "/contact",
      localized: [
        ["en", "/en/contact"],
        ["fr", "/fr/contact"],
      ],
    },
    {
      pattern: "/legal-notice",
      localized: [
        ["en", "/en/legal-notice"],
        ["fr", "/fr/legal-notice"],
      ],
    },
    {
      pattern: "/privacy-policy",
      localized: [
        ["en", "/en/privacy-policy"],
        ["fr", "/fr/privacy-policy"],
      ],
    },
    {
      pattern: "/samples/:igsn",
      localized: [
        ["en", "/en/samples/:igsn"],
        ["fr", "/fr/samples/:igsn"],
      ],
    },
  ],
};
