import i18next from "i18next";

import en from "../../messages/en.json" with { type: "json" };

export const DEFAULT_LOCALE = "en";

export type Locale = typeof DEFAULT_LOCALE;

declare module "i18next" {
  interface CustomTypeOptions {
    resources: { translation: typeof en };
  }
}

const instance = i18next.createInstance();

void instance.init({
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

export const translator = (locale: Locale = DEFAULT_LOCALE) =>
  instance.getFixedT(locale);

export type Translator = ReturnType<typeof translator>;
