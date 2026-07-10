import { describe, expect, it } from "vitest";

import { createOpaqueToken, hashToken } from "./security.js";

describe("token helpers", () => {
  it("creates opaque tokens with stable hashes", () => {
    const token = createOpaqueToken();

    expect(token.length).toBeGreaterThan(30);
    expect(hashToken(token)).toHaveLength(64);
    expect(hashToken(token)).toBe(hashToken(token));
  });
});
