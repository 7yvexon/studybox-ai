import assert from "node:assert/strict";
import test from "node:test";

import { defaultLearningSettings, isLearningSettings } from "./index.js";

test("recognizes the default learning settings", () => {
  assert.equal(isLearningSettings(defaultLearningSettings), true);
  assert.equal(isLearningSettings({ mode: "invalid" }), false);
});
