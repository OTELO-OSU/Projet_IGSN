import { Logo } from "@projet-igsn/design-system/components/icon/logo";
import { TanStackDevtools } from "@tanstack/react-devtools";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import type { MyRouterContext } from "../router-context";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import { m } from "../paraglide/messages.js";
import { getLocale, localizeHref } from "../paraglide/runtime.js";
import "../styles.css";

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: ({ matches }) => {
    // The router works on delocalized paths; the leaf match holds the current
    // one. Point the canonical at its English (base-locale) URL so search
    // engines rank one page per route regardless of the visitor's locale.
    const path = matches.at(-1)?.pathname ?? "/";
    return {
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        {
          title: m.app_title(),
        },
      ],
      links: [
        {
          rel: "canonical",
          href: localizeHref(path, { locale: "en" }),
        },
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/favicon.svg",
        },
        {
          rel: "manifest",
          href: "/manifest.json",
        },
      ],
    };
  },
  component: RootLayout,
  shellComponent: RootDocument,
});

function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-background/80 sticky top-0 z-40 flex h-24 items-center gap-3 border-b px-4 backdrop-blur">
        <Link
          to="/"
          aria-label={m.app_title()}
          className="flex items-center gap-3 text-sky-900"
        >
          <Logo />
          <span className="flex flex-col leading-tight">
            <span className="text-2xl font-bold">{m.app_title()}</span>
            <span className="text-muted-foreground text-sm">
              {m.app_subtitle()}
            </span>
          </span>
        </Link>
      </header>

      <main className="w-full flex-1 flex-col">
        <Outlet />
      </main>

      <footer className="bg-muted/30 mt-16 border-t">
        <div className="flex flex-col gap-8 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-8">
            <img
              src={`${import.meta.env.BASE_URL}republique-francaise.svg`}
              alt={m.footer_logo_republique_francaise()}
              className="h-20 w-auto"
            />
            <img
              src={`${import.meta.env.BASE_URL}gaia-data.svg`}
              alt={m.footer_logo_gaia_data()}
              className="h-20 w-auto"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
