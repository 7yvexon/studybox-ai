import { describe, expect, it } from "vitest";
import { defaultLearningSettings, isLearningSettings } from "@studybox/shared";

describe("learning defaults", () => {
  it("uses a valid initial learning configuration", () => {
    expect(isLearningSettings(defaultLearningSettings)).toBe(true);
    expect(defaultLearningSettings.mode).toBe("concept");
  });
});
