import logger from "#utils/logger";

export async function generateCommitPlan(config, prompt) {
  const apiKey =
    process.env.VIBE_GIT_AI_API_KEY || process.env.GEN_COMMIT_AI_API_KEY;
  if (!apiKey) {
    throw new Error("VIBE_GIT_AI_API_KEY is not set in environment variables.");
  }

  const modelName = config["llm-openai-model"]?.modelName || "gpt-4o";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `OpenAI API Error: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    logger.error("Error communicating with OpenAI:");
    throw error;
  }
}
