import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateCommitPlan(config, prompt) {
  const apiKey = process.env.GEN_COMMIT_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEN_COMMIT_AI_API_KEY is not set in environment variables.",
    );
  }

  const modelName = config["llm-gemini-model"].modelName;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const result = await model.generateContent(prompt);
  return result.response.text();
}
