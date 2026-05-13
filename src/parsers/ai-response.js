export function parseJsonResponse(raw) {
  const attempts = [
    () => JSON.parse(raw),
    () => {
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (!match) throw new Error("No code block found");
      return JSON.parse(match[1].trim());
    },
    () => {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end <= start) {
        throw new Error("No JSON object found");
      }
      return JSON.parse(raw.slice(start, end + 1));
    },
  ];

  for (const attempt of attempts) {
    try {
      return attempt();
    } catch {
      continue;
    }
  }

  throw new Error("AI returned invalid JSON. Try running again.");
}
