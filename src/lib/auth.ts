import { randomBytes, randomInt } from "node:crypto";

import bcrypt from "bcryptjs";

import { normalizePhoneNumber } from "./domain";

export async function hashSecret(secret: string) {
  return bcrypt.hash(secret, 10);
}

export async function verifySecret(secret: string, hash: string) {
  return bcrypt.compare(secret, hash);
}

export function normalizeCustomerPhone(input: string) {
  return normalizePhoneNumber(input);
}

export function generateLoyaltyPin(existingPins: Iterable<string> = []) {
  const taken = new Set(existingPins);

  for (let attempts = 0; attempts < 1000; attempts += 1) {
    const pin = randomInt(0, 1_000_000).toString().padStart(6, "0");
    if (!taken.has(pin)) {
      return pin;
    }
  }

  throw new Error("Impossible de générer un PIN unique.");
}

export function normalizeStaffEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateAccessLinkToken() {
  return randomBytes(24).toString("base64url");
}
