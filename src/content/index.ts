import { fr } from "./fr";

export const messages = {
  fr,
};

export type Locale = keyof typeof messages;

export const defaultLocale: Locale = "fr";

export function getMessages(locale: string | undefined) {
  if (locale === "fr") {
    return fr;
  }

  return fr;
}
