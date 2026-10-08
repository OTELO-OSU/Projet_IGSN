import { ExternalLink } from "@projet-igsn/design-system/components/ui/external-link";

import { m } from "#/paraglide/messages.js";

function partners() {
  return [
    {
      href: "https://www.cnrs.fr/",
      logo: "logo-cnrs.svg",
      logoWidth: 203,
      logoHeight: 203,
      logoClassName: "h-28 w-auto",
      role: m.partners_cnrs_role(),
      name: m.partners_cnrs_name(),
      text: m.partners_cnrs_text(),
      cardClassName: "bg-primary/5",
      roleClassName: "text-primary",
      barClassName: "bg-primary",
    },
    {
      href: "https://otelo.univ-lorraine.fr/",
      logo: "logo-otelo.svg",
      logoWidth: 315,
      logoHeight: 82,
      logoClassName: "h-auto w-40",
      role: m.partners_otelo_role(),
      name: m.partners_otelo_name(),
      text: m.partners_otelo_text(),
      cardClassName: "bg-secondary/5",
      roleClassName: "text-secondary",
      barClassName: "bg-secondary",
    },
    {
      href: "https://www.data-terra.org/",
      logo: "logo-gaiadata.png",
      logoWidth: 256,
      logoHeight: 256,
      logoClassName: "h-34 w-auto",
      role: m.partners_gaiadata_role(),
      name: m.partners_gaiadata_name(),
      text: m.partners_gaiadata_text(),
      cardClassName: "bg-tertiary/5",
      roleClassName: "text-[#a14e2e]",
      barClassName: "bg-tertiary",
    },
    {
      href: "https://marmelab.com/",
      logo: "logo-marmelab.svg",
      logoWidth: 111,
      logoHeight: 91,
      logoClassName: "h-25 w-auto",
      role: m.partners_marmelab_role(),
      name: m.partners_marmelab_name(),
      text: m.partners_marmelab_text(),
      cardClassName: "bg-violet-50",
      roleClassName: "text-violet-700",
      barClassName: "bg-violet-600",
    },
  ];
}

export function Partners() {
  return (
    <>
      <div className="bg-primary/5 relative isolate overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 -z-10 hidden w-3/5 bg-cover lg:block"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}photos/partners-mountains.jpg)`,
            maskImage:
              "linear-gradient(to right, rgb(0 0 0 / 0) 10%, rgb(0 0 0 / 0.028) 18.5%, rgb(0 0 0 / 0.104) 27.0%, rgb(0 0 0 / 0.216) 35.5%, rgb(0 0 0 / 0.352) 44.0%, rgb(0 0 0 / 0.500) 52.5%, rgb(0 0 0 / 0.648) 61.0%, rgb(0 0 0 / 0.784) 69.5%, rgb(0 0 0 / 0.896) 78.0%, rgb(0 0 0 / 0.972) 86.5%, black 95%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-primary text-sm font-bold tracking-widest uppercase">
            {m.partners_eyebrow()}
          </p>
          <h1 className="text-primary mt-3 text-4xl font-bold sm:text-5xl sm:leading-tight sm:whitespace-pre-line">
            {m.partners_title()}
          </h1>
          <span aria-hidden className="mt-6 block h-1 w-12 bg-[#1158af]" />
          <p className="mt-6 max-w-xl text-lg text-[#4a6489]">
            {m.partners_lead()}
          </p>
        </div>
      </div>

      <ul className="mx-auto mt-24 grid max-w-6xl gap-16 px-6 xl:grid-cols-2">
        {partners().map((partner) => (
          <li
            key={partner.href}
            className={`flex flex-col gap-4 rounded-lg p-6 sm:flex-row sm:items-center sm:gap-6 ${partner.cardClassName}`}
          >
            <ExternalLink
              href={partner.href}
              className="flex shrink-0 self-start text-inherit no-underline sm:w-40 sm:justify-center sm:self-auto"
            >
              <img
                src={`${import.meta.env.BASE_URL}${partner.logo}`}
                alt={partner.name}
                width={partner.logoWidth}
                height={partner.logoHeight}
                className={partner.logoClassName}
              />
            </ExternalLink>
            <div className="min-w-0">
              <p
                className={`text-sm font-semibold tracking-widest uppercase ${partner.roleClassName}`}
              >
                {partner.role}
              </p>
              <span
                aria-hidden
                className={`mt-2 block h-1 w-8 ${partner.barClassName}`}
              />
              <h2 className="text-primary mt-3 text-2xl font-bold">
                {partner.name}
              </h2>
              <p className="text-body mt-3">{partner.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mx-auto mt-24 flex max-w-3xl flex-col items-center gap-6 px-6 text-center sm:flex-row sm:justify-center sm:text-left">
        <svg
          aria-hidden
          viewBox="11 13 68 34"
          fill="currentColor"
          className="h-12 w-24 shrink-0 text-[#2461be]"
        >
          <path d="M12.32 46.32 L31.50 28.06 L36.80 33.00 L38.00 31.80 L32.28 25.72 A1.10 1.10 0 0 0 30.72 25.72 L11.68 45.68 A0.45 0.45 0 0 0 12.32 46.32 Z M28.86 46.26 L50.93 17.06 L62.69 35.50 A0.95 0.95 0 0 0 64.32 35.48 L67.04 30.72 L77.62 46.24 A0.45 0.45 0 0 0 78.38 45.76 L67.76 28.51 A0.90 0.90 0 0 0 66.22 28.55 L63.47 33.16 L51.98 14.39 A1.15 1.15 0 0 0 50.07 14.32 L28.14 45.74 A0.45 0.45 0 0 0 28.86 46.26 Z" />
        </svg>
        <span
          aria-hidden
          className="bg-border hidden w-px self-stretch sm:block"
        />
        <div>
          <p className="text-primary text-lg font-bold sm:whitespace-pre-line">
            {m.partners_band_title()}
          </p>
          <p className="text-body mt-1 sm:whitespace-pre-line">
            {m.partners_band_text()}
          </p>
        </div>
      </div>
    </>
  );
}
