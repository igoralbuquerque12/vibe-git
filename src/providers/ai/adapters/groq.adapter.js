/**
 * Adapter for the Groq API.
 *
 * @implements {{ generateContent(prompt: string, systemPrompt?: string): Promise<object> }}
 */
export class GroqAdapter {
  constructor(apiKey, modelName) {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  /**
   * @param {string} prompt
   * @param {string} systemPrompt
   * @returns {Promise<object>}
   */
  async generateContent(prompt, systemPrompt) {
    const messages = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    messages.push({ role: "user", content: prompt });

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Groq API Error: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Groq API returned an empty response.");
    }

    return {
      content,
      usage: {
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      },
    };
  }
}
