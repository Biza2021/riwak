import { fr } from "@/content/fr";

export function getErrorMessage(code?: string | string[]) {
  if (!code || Array.isArray(code)) {
    return null;
  }

  const value = fr.errors[code as keyof typeof fr.errors];
  return value ?? fr.errors.UNKNOWN;
}

export function getSuccessMessage(code?: string | string[]) {
  if (!code || Array.isArray(code)) {
    return null;
  }

  return code === "1" ? "Enregistré." : null;
}
