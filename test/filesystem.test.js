import assert from "node:assert/strict";
import test from "node:test";

import { withFileExtension } from "../src/shared/filesystem.js";

test("withFileExtension adds .json when it is omitted", () => {
  assert.equal(withFileExtension("example", ".json"), "example.json");
});

test("withFileExtension preserves an existing extension case-insensitively", () => {
  assert.equal(withFileExtension("example.json", ".json"), "example.json");
  assert.equal(withFileExtension("example.JSON", ".json"), "example.JSON");
});

test("withFileExtension preserves an empty filename", () => {
  assert.equal(withFileExtension(undefined, ".json"), undefined);
});
