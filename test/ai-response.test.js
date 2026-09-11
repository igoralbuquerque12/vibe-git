import assert from "node:assert/strict";
import test from "node:test";

import {
  formatTokenUsage,
  normalizeAiResponse,
} from "../src/providers/ai/ai-response.js";

test("formatTokenUsage creates a minimal input/output/total summary", () => {
  assert.equal(
    formatTokenUsage({ inputTokens: 10, outputTokens: 4, totalTokens: 14 }),
    "tokens: 10 input / 4 output / 14 total"
  );
});

test("normalizeAiResponse keeps compatibility with string-only providers", () => {
  assert.deepEqual(normalizeAiResponse("plan"), {
    content: "plan",
    usage: {},
  });
});
