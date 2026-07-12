import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultLearningSettings,
  isLearningSettings,
  normalizeAnswerLevel,
  normalizeLearningSettings
} from "./index.js";

test("recognizes the default learning settings", () => {
  assert.equal(isLearningSettings(defaultLearningSettings), true);
  assert.equal(isLearningSettings({ mode: "invalid" }), false);
});

test("isLearningSettings rejects non-object and partial inputs", () => {
  assert.equal(isLearningSettings(null), false);
  assert.equal(isLearningSettings("concept"), false);
  assert.equal(isLearningSettings({ mode: "concept" }), false);
  assert.equal(
    isLearningSettings({ mode: "concept", level: "middle2", responseLength: "standard" }),
    true
  );
  assert.equal(
    isLearningSettings({ mode: "concept", level: "basic", responseLength: "standard" }),
    false
  );
});

test("normalizeAnswerLevel handles valid, legacy, and invalid inputs", () => {
  assert.equal(normalizeAnswerLevel("middle1"), "middle1");
  assert.equal(normalizeAnswerLevel("high3"), "high3");
  assert.equal(normalizeAnswerLevel("basic"), "middle1");
  assert.equal(normalizeAnswerLevel("standard"), "middle2");
  assert.equal(normalizeAnswerLevel("advanced"), "high2");
  assert.equal(normalizeAnswerLevel("unknown"), null);
  assert.equal(normalizeAnswerLevel(null), null);
  assert.equal(normalizeAnswerLevel(undefined), null);
  assert.equal(normalizeAnswerLevel(123), null);
});

test("normalizeLearningSettings handles valid, legacy, and invalid combinations", () => {
  const valid = normalizeLearningSettings({
    mode: "concept",
    level: "middle2",
    responseLength: "short"
  });
  assert.deepEqual(valid, { mode: "concept", level: "middle2", responseLength: "short" });

  const legacy = normalizeLearningSettings({
    mode: "solve",
    level: "advanced",
    responseLength: "detailed"
  });
  assert.equal(legacy?.level, "high2");

  assert.equal(normalizeLearningSettings(null), null);
  assert.equal(normalizeLearningSettings("concept"), null);
  assert.equal(
    normalizeLearningSettings({ mode: "invalid", level: "middle2", responseLength: "short" }),
    null
  );
  assert.equal(
    normalizeLearningSettings({ mode: "concept", level: "middle2", responseLength: "invalid" }),
    null
  );
  assert.equal(
    normalizeLearningSettings({ mode: "concept", level: "unknown", responseLength: "short" }),
    null
  );
});