import type { Locale } from "#/paraglide/runtime";
import type { FileRoutesByTo } from "#/routeTree.gen";

// Adapted from TanStack's start-i18n-paraglide example. Maps every public route
// to a per-locale localized path and emits paraglide `urlPatterns` prefixed with
// the locale (the `:lang` base). Typed against the generated route tree, so a new
// route with no translation entry fails to compile. Adding `fr` is one more
// column per entry.

type RoutePath = keyof FileRoutesByTo;

// Routes owned by other apps/prefixes that must not be localized here.
const excludedPaths = [] as const;

type PublicRoutePath = Exclude<
  RoutePath,
  `${string}${(typeof excludedPaths)[number]}${string}`
>;

type TranslatedPathname = {
  pattern: string;
  localized: Array<[Locale, string]>;
};

function toUrlPattern(path: string) {
  return (
    path
      // catch-all
      .replace(/\/\$$/, "/:path(.*)?")
      // optional parameters: {-$param}
      .replace(/\{-\$([a-zA-Z0-9_]+)\}/g, ":$1?")
      // named parameters: $param
      .replace(/\$([a-zA-Z0-9_]+)/g, ":$1")
      // remove trailing slash
      .replace(/\/+$/, "")
  );
}

function createTranslatedPathnames(
  input: Record<PublicRoutePath, Partial<Record<Locale, string>>>,
): TranslatedPathname[] {
  return Object.entries(input).map(([pattern, locales]) => ({
    pattern: toUrlPattern(pattern),
    localized: Object.entries(locales).map(
      ([locale, path]) =>
        [
          locale as Locale,
          `/${locale}${toUrlPattern(path as string)}`,
        ] satisfies [Locale, string],
    ),
  }));
}

export const translatedPathnames = createTranslatedPathnames({
  "/": { en: "/" },
  "/search": { en: "/search" },
  "/samples/$igsn": { en: "/samples/$igsn" },
});
