/**
 * Adapter for the Gemini API.
 *
 * @implements {{ generateContent(prompt: string): Promise<string> }}
 */
export class GeminiAdapter {
  constructor(apiKey, modelName) {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  /**
   * @param {string} prompt
   * @returns {Promise<string>}
   */
  async generateContent(prompt) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
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

    return text;
  }
}
