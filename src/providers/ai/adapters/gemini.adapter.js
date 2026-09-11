/**
 * Adapter for the Gemini API.
 *
 * @implements {{ generateContent(prompt: string, systemPrompt?: string): Promise<object> }}
 */
export class GeminiAdapter {
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
    const body = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };

    if (systemPrompt) {
      body.system_instruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Gemini API Error: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("");

    if (!text) {
      throw new Error("Gemini API returned an empty response.");
    }

    const usage = data.usageMetadata || data.usage_metadata || {};

    return {
      content: text,
      usage: {
        inputTokens: usage.promptTokenCount ?? usage.prompt_token_count,
        outputTokens: usage.candidatesTokenCount ?? usage.candidates_token_count,
        totalTokens: usage.totalTokenCount ?? usage.total_token_count,
      },
    };
  }
}
