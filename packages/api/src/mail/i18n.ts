import i18next from "i18next";

import en from "../../messages/en.json" with { type: "json" };

export const DEFAULT_LOCALE = "en";

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

// ponytail: every mail is English until a `user.locale` column, fed from the Keycloak claim, carries the recipient's own; then this takes it as a parameter.
export const translator = () => instance.getFixedT(DEFAULT_LOCALE);

export type Translator = ReturnType<typeof translator>;
