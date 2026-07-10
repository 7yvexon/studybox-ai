import { randomBytes } from "node:crypto";

import { createInviteCode } from "../db/repository.js";
import { closeDatabase } from "../db/index.js";
import { hashToken } from "../lib/security.js";

const requestedCode = process.argv[2];
const code = requestedCode?.trim() || randomBytes(9).toString("base64url");
const expiresInDays = Number(process.env.INVITE_EXPIRES_IN_DAYS || "0");
const expiresAt = Number.isFinite(expiresInDays) && expiresInDays > 0
  ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
  : null;

if (code.length < 8) {
  process.stderr.write("Invite code must be at least 8 characters long.\n");
  process.exitCode = 1;
} else {
  createInviteCode({ codeHash: hashToken(code), createdBy: "cli", expiresAt })
    .then(async () => {
      process.stdout.write(`Invite code: ${code}\n`);
      await closeDatabase();
    })
    .catch(async (error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : "Invite creation failed"}\n`);
      await closeDatabase();
      process.exitCode = 1;
    });
}
