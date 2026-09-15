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
import { RequestServiceAccountDialog } from "../domain/service-accounts/request-service-account-dialog.tsx";
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

function RootLayout() {
  return (
    <AuthProvider userManager={userManager} onSigninCallback={onSigninCallback}>
      <div className="flex min-h-svh flex-col">
        <header className="bg-background/80 sticky top-0 z-40 flex h-24 items-center border-b pr-4 backdrop-blur">
          <Link
            to="/"
            aria-label={m.app_title()}
            className="flex h-full items-center"
          >
            <img
              src={`${import.meta.env.BASE_URL}logo-igsn.png`}
              alt=""
              className="h-full w-auto"
            />
          </Link>
          <div className="ml-auto">
            <AuthControls />
          </div>
        </header>

        <main className="w-full flex-1">
          <Outlet />
        </main>
        <Toaster />

        <footer className="bg-muted/30 mt-16 border-t">
          <div className="flex flex-col gap-8 px-6 py-10 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-8">
              <img
                src={`${import.meta.env.BASE_URL}logo_cnrs-insu.png`}
                alt={m.footer_logo_cnrs_insu()}
                className="h-20 w-auto"
              />
              <img
                src={`${import.meta.env.BASE_URL}gaia-data.svg`}
                alt={m.footer_logo_gaia_data()}
                className="h-20 w-auto"
              />
            </div>
            <RequestServiceAccountDialog />
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
