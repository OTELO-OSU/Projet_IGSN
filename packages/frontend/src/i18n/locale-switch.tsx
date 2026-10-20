import { Fragment } from "react";

import { m } from "#/paraglide/messages.js";
import {
  getLocale,
  locales,
  setLocale,
  type Locale,
} from "#/paraglide/runtime.js";

const LOCALE_NAMES: Record<Locale, () => string> = {
  en: m.locale_name_en,
  fr: m.locale_name_fr,
};

export function LocaleSwitch() {
  const currentLocale = getLocale();
  return (
    <div className="text-primary flex shrink-0 items-center gap-x-2 font-medium">
      {locales.map((locale, index) => (
        <Fragment key={locale}>
          {index > 0 && <span aria-hidden>/</span>}
          {locale === currentLocale ? (
            <span
              aria-current="true"
              className="decoration-primary flex min-h-11 items-center underline decoration-2 underline-offset-8 md:min-h-0"
            >
              {locale.toUpperCase()}
            </span>
          ) : (
            <button
              type="button"
              lang={locale}
              aria-label={LOCALE_NAMES[locale]()}
              onClick={() => setLocale(locale)}
              className="flex min-h-11 cursor-pointer items-center underline-offset-8 hover:underline md:min-h-0"
            >
              {locale.toUpperCase()}
            </button>
          )}
        </Fragment>
      ))}
    </div>
  );
}
