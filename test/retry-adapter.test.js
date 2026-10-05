import assert from "node:assert/strict";
import test from "node:test";

import { RetryAiAdapter } from "../src/providers/ai/adapters/retry.adapter.js";
import logger from "../src/shared/logger.js";

test("RetryAiAdapter makes up to three attempts with a five-second delay", async () => {
  let attempts = 0;
  const delays = [];
  const errors = [];
  const originalLoggerError = logger.error;
  logger.error = message => errors.push(message);

  const provider = {
    generateContent: async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error("provider unavailable");
      }

      return { content: "plan", usage: {} };
    },
  };
  const adapter = new RetryAiAdapter(provider, {
    waitFn: async delay => delays.push(delay),
  });

  try {
    assert.deepEqual(await adapter.generateContent("prompt"), {
      content: "plan",
      usage: {},
    });
  } finally {
    logger.error = originalLoggerError;
  }

  assert.equal(attempts, 3);
  assert.deepEqual(delays, [5000, 5000]);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /attempt 1\/3/);
  assert.match(errors[0], /retrying in 5 seconds/);
});

test("RetryAiAdapter rethrows the last failure after three attempts", async () => {
  let attempts = 0;
  const originalLoggerError = logger.error;
  logger.error = () => {};

  const adapter = new RetryAiAdapter(
    {
      generateContent: async () => {
        attempts++;
        throw new Error("still unavailable");
      },
    },
    { waitFn: async () => {} }
  );

  try {
    await assert.rejects(adapter.generateContent("prompt"), /still unavailable/);
  } finally {
    logger.error = originalLoggerError;
  }

  assert.equal(attempts, 3);
});
