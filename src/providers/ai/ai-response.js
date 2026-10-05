export function normalizeAiResponse(response) {
  if (typeof response === "string") {
    return { content: response, usage: {} };
  }

  return response;
}

export function formatTokenUsage(usage = {}) {
  const input = usage.inputTokens ?? "n/a";
  const output = usage.outputTokens ?? "n/a";
  const total = usage.totalTokens ?? "n/a";

  return `tokens: ${input} input / ${output} output / ${total} total`;
}
