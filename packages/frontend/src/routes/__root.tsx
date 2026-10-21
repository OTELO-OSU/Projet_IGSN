import faviconUrl from "@projet-igsn/design-system/assets/favicon.png";
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

import { onSigninCallback, userManager } from "../auth/oidc-config.ts";
import { DemoBanner } from "../demo-banner.tsx";
import { OpenDataLink } from "../domain/samples/open-data-link.tsx";
import { FRONTEND_URL } from "../frontend-url.ts";
import { SiteHeader } from "../header/site-header.tsx";
import { m } from "../paraglide/messages.js";
import { getLocale, locales, localizeHref } from "../paraglide/runtime.js";
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
          href: new URL(localizeHref(path), FRONTEND_URL).href,
        },
        ...locales.map((locale) => ({
          rel: "alternate",
          hrefLang: locale,
          href: new URL(localizeHref(path, { locale }), FRONTEND_URL).href,
        })),
        {
          rel: "alternate",
          hrefLang: "x-default",
          href: new URL(localizeHref(path, { locale: "en" }), FRONTEND_URL)
            .href,
        },
        {
          rel: "icon",
          type: "image/png",
          href: faviconUrl,
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
        <DemoBanner />
        <SiteHeader />

        <main className="w-full flex-1">
          <Outlet />
        </main>
        <Toaster />

        <footer className="mt-16 pb-10">
          <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] grid-rows-[2.5rem_auto] gap-x-6 gap-y-2 px-6 pt-10">
            <span aria-hidden className="bg-border h-px self-end" />
            <ExternalLink
              href="https://www.cnrs.fr/"
              className="row-span-2 self-start"
            >
              <img
                src={`${import.meta.env.BASE_URL}logo-cnrs.svg`}
                alt={m.footer_logo_cnrs()}
                className="h-20 w-auto"
              />
            </ExternalLink>
            <span aria-hidden className="bg-border h-px self-end" />
            <div className="col-span-3 flex flex-col items-start gap-2 self-start lg:col-span-1 lg:col-start-1 lg:row-start-2 lg:flex-row lg:flex-wrap lg:gap-x-4">
              <OpenDataLink className="text-primary text-sm font-medium no-underline underline-offset-4 hover:underline" />
              <Link
                to="/contact"
                className="text-primary text-sm font-medium underline-offset-4 hover:underline"
              >
                {m.footer_contact()}
              </Link>
            </div>
            <div className="col-span-3 flex flex-col items-start gap-2 self-start lg:col-span-1 lg:col-start-3 lg:row-start-2 lg:flex-row lg:flex-wrap lg:justify-end lg:gap-x-4 lg:pe-2">
              <Link
                to="/legal-notice"
                className="text-primary text-sm font-medium underline-offset-4 hover:underline"
              >
                {m.footer_legal_notice()}
              </Link>
              <Link
                to="/privacy-policy"
                className="text-primary text-sm font-medium underline-offset-4 hover:underline"
              >
                {m.footer_privacy_policy()}
              </Link>
              <Link
                to="/terms-of-use"
                className="text-primary text-sm font-medium underline-offset-4 hover:underline"
              >
                {m.footer_terms_of_use()}
              </Link>
            </div>
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
