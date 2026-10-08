import { ExternalLink } from "@projet-igsn/design-system/components/ui/external-link";
import { Toaster } from "@projet-igsn/design-system/components/ui/sonner";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { AuthProvider } from "react-oidc-context";

import type { MyRouterContext } from "../router-context";

import { AuthControls } from "../auth/auth-controls.tsx";
import { onSigninCallback, userManager } from "../auth/oidc-config.ts";
import { m } from "../paraglide/messages.js";
import { getLocale, localizeHref } from "../paraglide/runtime.js";
import "../styles.css";

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: ({ matches }) => {
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
          type: "image/png",
          href: "/favicon.png",
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

const NAV_LINK_CLASS =
  "text-primary data-[status=active]:decoration-primary font-medium underline-offset-8 data-[status=active]:underline data-[status=active]:decoration-2";

function RootLayout() {
  return (
    <AuthProvider userManager={userManager} onSigninCallback={onSigninCallback}>
      <div className="flex min-h-svh flex-col">
        <header className="bg-background/80 sticky top-0 z-40 backdrop-blur">
          <div className="mx-auto flex h-20 max-w-6xl items-center gap-3 px-6 sm:h-32 sm:gap-6">
            <Link to="/" aria-label={m.app_title()} className="shrink-0">
              <img
                src={`${import.meta.env.BASE_URL}logo-igsn.svg`}
                alt=""
                className="h-12 w-auto sm:h-22"
              />
            </Link>
            <nav
              aria-label={m.header_nav_label()}
              className="ml-auto flex gap-4 sm:gap-6"
            >
              <Link
                to="/"
                activeOptions={{ exact: true }}
                className={NAV_LINK_CLASS}
              >
                {m.header_nav_search()}
              </Link>
              <Link to="/faq" className={NAV_LINK_CLASS}>
                {m.header_nav_faq()}
              </Link>
            </nav>
            <AuthControls />
          </div>
        </header>

        <main className="w-full flex-1">
          <Outlet />
        </main>
        <Toaster />

        <footer className="mt-16">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-10">
            <span aria-hidden className="bg-border h-px flex-1" />
            <ExternalLink href="https://www.cnrs.fr/" className="shrink-0">
              <img
                src={`${import.meta.env.BASE_URL}logo-cnrs.svg`}
                alt={m.footer_logo_cnrs()}
                className="h-20 w-auto"
              />
            </ExternalLink>
            <span aria-hidden className="bg-border h-px flex-1" />
          </div>
        </footer>
      </div>
    </AuthProvider>
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
        <Scripts />
      </body>
    </html>
  );
}
