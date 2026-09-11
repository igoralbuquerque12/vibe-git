import assert from "node:assert/strict";
import test from "node:test";

import { GeminiAdapter } from "../src/providers/ai/adapters/gemini.adapter.js";
import { GroqAdapter } from "../src/providers/ai/adapters/groq.adapter.js";
import { OpenAIAdapter } from "../src/providers/ai/adapters/openai.adapter.js";

async function withMockedFetch(payload, callback) {
  const originalFetch = global.fetch;
  let request;

  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => payload,
    };
  };

  try {
    const result = await callback();
    return { request, result };
  } finally {
    global.fetch = originalFetch;
  }
}

test("OpenAI sends the system prompt and maps token usage", async () => {
  const payload = {
    choices: [{ message: { content: "openai plan" } }],
    usage: { input_tokens: 12, output_tokens: 5, total_tokens: 17 },
  };
  const adapter = new OpenAIAdapter("key", "model");
  const { request, result } = await withMockedFetch(
    payload,
    () => adapter.generateContent("user prompt", "system prompt")
  );

  const body = JSON.parse(request.options.body);
  assert.deepEqual(body.messages, [
    { role: "system", content: "system prompt" },
    { role: "user", content: "user prompt" },
  ]);
  assert.deepEqual(result, {
    content: "openai plan",
    usage: { inputTokens: 12, outputTokens: 5, totalTokens: 17 },
  });
});

test("OpenAI supports Chat Completions token field names", async () => {
  const payload = {
    choices: [{ message: { content: "openai plan" } }],
    usage: { prompt_tokens: 13, completion_tokens: 6, total_tokens: 19 },
  };
  const adapter = new OpenAIAdapter("key", "model");
  const { result } = await withMockedFetch(
    payload,
    () => adapter.generateContent("user prompt")
  );

  assert.deepEqual(result.usage, {
    inputTokens: 13,
    outputTokens: 6,
    totalTokens: 19,
  });
});

test("Groq sends the system prompt and maps token usage", async () => {
  const payload = {
    choices: [{ message: { content: "groq plan" } }],
    usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 },
  };
  const adapter = new GroqAdapter("key", "model");
  const { request, result } = await withMockedFetch(
    payload,
    () => adapter.generateContent("user prompt", "system prompt")
  );

  const body = JSON.parse(request.options.body);
  assert.deepEqual(body.messages, [
    { role: "system", content: "system prompt" },
    { role: "user", content: "user prompt" },
  ]);
  assert.deepEqual(result, {
    content: "groq plan",
    usage: { inputTokens: 20, outputTokens: 8, totalTokens: 28 },
  });
});

test("Gemini sends the system prompt and maps token usage", async () => {
  const payload = {
    candidates: [{ content: { parts: [{ text: "gemini " }, { text: "plan" }] } }],
    usageMetadata: {
      promptTokenCount: 30,
      candidatesTokenCount: 9,
      totalTokenCount: 39,
    },
  };
  const adapter = new GeminiAdapter("key", "model");
  const { request, result } = await withMockedFetch(
    payload,
    () => adapter.generateContent("user prompt", "system prompt")
  );

  const body = JSON.parse(request.options.body);
  assert.deepEqual(body.system_instruction, {
    parts: [{ text: "system prompt" }],
  });
  assert.deepEqual(result, {
    content: "gemini plan",
    usage: { inputTokens: 30, outputTokens: 9, totalTokens: 39 },
  });
});
