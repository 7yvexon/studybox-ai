import { createHash, randomBytes, randomUUID } from "node:crypto";

import argon2 from "argon2";

export const createId = () => randomUUID();

export const createOpaqueToken = () => randomBytes(32).toString("base64url");

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const hashPassword = (password: string) =>
  argon2.hash(password, { type: argon2.argon2id });

export const verifyPassword = (hash: string, password: string) => argon2.verify(hash, password);

let dummyPasswordHashPromise: Promise<string> | null = null;
export const getDummyPasswordHash = () => {
  if (!dummyPasswordHashPromise) {
    dummyPasswordHashPromise = hashPassword("studybox-dummy-verifier-do-not-use");
  }
  return dummyPasswordHashPromise;
};
