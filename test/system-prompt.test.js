import assert from "node:assert/strict";
import test from "node:test";

import { systemPrompt } from "../src/constants/fixed-prompt.js";

test("system prompt rejects PR placeholders and generic introductions", () => {
  assert.match(systemPrompt, /Descrição da PR/);
  assert.match(systemPrompt, /replace every placeholder/i);
  assert.match(systemPrompt, /Esta pull request implementa/);
});
