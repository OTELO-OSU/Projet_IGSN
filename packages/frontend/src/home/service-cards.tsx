import type { ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, BookOpenIcon, UserPlusIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";

import { AccountCta } from "./account-cta.tsx";

function ServiceCard({
  icon,
  title,
  text,
  action,
  className,
  iconClassName,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action: ReactNode;
  className: string;
  iconClassName: string;
}) {
  return (
    <div className={`text-primary flex gap-6 rounded-lg p-6 ${className}`}>
      <span
        className={`flex size-22 shrink-0 items-center justify-center rounded-full ${iconClassName}`}
      >
        {icon}
      </span>
      <div className="flex flex-col items-start gap-3">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-body text-lg whitespace-pre-line">{text}</p>
        <div className="mt-2">{action}</div>
      </div>
    </div>
  );
}

export function ServiceCards() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-16 px-6 md:grid-cols-2">
      <ServiceCard
        className="bg-primary/5"
        iconClassName="bg-[#d1e7f4] text-primary"
        icon={<UserPlusIcon aria-hidden className="size-10" />}
        title={m.home_declare_title()}
        text={m.home_declare_text()}
        action={
          <AccountCta
            variant="link"
            className="h-auto p-0 text-base font-semibold text-[#1d65af] has-[>svg]:px-0"
          >
            {m.home_declare_cta()}
            <ArrowRightIcon aria-hidden />
          </AccountCta>
        }
      />
      <ServiceCard
        className="bg-secondary/5"
        iconClassName="bg-[#cce6dc] text-secondary"
        icon={<BookOpenIcon aria-hidden className="size-10" />}
        title={m.home_about_title()}
        text={m.home_about_text()}
        action={
          <Button
            asChild
            variant="link"
            className="text-secondary h-auto p-0 text-base font-semibold has-[>svg]:px-0"
          >
            <Link to="/faq">
              {m.home_about_cta()}
              <ArrowRightIcon aria-hidden />
            </Link>
          </Button>
        }
      />
    </div>
  );
}
