import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Link } from "@tanstack/react-router";
import { MenuIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AuthControls } from "#/auth/auth-controls.tsx";
import { m } from "#/paraglide/messages.js";

const NAV_LINK_CLASS =
  "text-primary data-[status=active]:decoration-primary flex min-h-11 items-center font-medium underline-offset-8 data-[status=active]:underline data-[status=active]:decoration-2 md:min-h-0";

const MENU_ID = "site-menu";

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      menuButtonRef.current?.focus();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <header className="bg-background/80 sticky top-0 z-40 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center gap-3 px-6 sm:h-32 sm:gap-6">
        <Link to="/" aria-label={m.app_title()} className="shrink-0">
          <img
            src={`${import.meta.env.BASE_URL}logo-igsn.svg`}
            alt=""
            className="h-12 w-auto sm:h-22"
          />
        </Link>
        <Button
          ref={menuButtonRef}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={m.header_menu()}
          aria-expanded={isOpen}
          aria-controls={MENU_ID}
          onClick={() => setIsOpen(!isOpen)}
          className="text-primary ml-auto size-11 md:hidden"
        >
          {isOpen ? (
            <XIcon aria-hidden className="size-6" />
          ) : (
            <MenuIcon aria-hidden className="size-6" />
          )}
        </Button>
        <div
          id={MENU_ID}
          className={`${isOpen ? "flex" : "hidden"} bg-background absolute inset-x-0 top-full flex-col items-start gap-4 border-b px-6 py-4 md:static md:ml-auto md:flex md:flex-row md:items-center md:gap-6 md:border-0 md:bg-transparent md:p-0`}
        >
          <nav
            aria-label={m.header_nav_label()}
            className="flex flex-col md:flex-row md:gap-6"
          >
            <Link
              to="/"
              activeOptions={{ exact: true }}
              onClick={close}
              className={NAV_LINK_CLASS}
            >
              {m.header_nav_search()}
            </Link>
            <Link to="/partners" onClick={close} className={NAV_LINK_CLASS}>
              {m.header_nav_partners()}
            </Link>
            <Link to="/faq" onClick={close} className={NAV_LINK_CLASS}>
              {m.header_nav_faq()}
            </Link>
          </nav>
          <AuthControls />
        </div>
      </div>
    </header>
  );
}
