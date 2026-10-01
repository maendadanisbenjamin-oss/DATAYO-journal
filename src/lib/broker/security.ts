import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

function hashBridgeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyBridgeToken(
  token: string,
  expectedHash: string,
) {
  if (!token || !expectedHash) return false;

  const actual = Buffer.from(hashBridgeToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) return false;

  return timingSafeEqual(actual, expected);
}

export function createBridgeTokenHash(token: string) {
  if (!token) {
    throw new Error("Le token du bridge est requis.");
  }

  return hashBridgeToken(token);
}
