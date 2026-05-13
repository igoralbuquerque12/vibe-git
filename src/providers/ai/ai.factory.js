import { GeminiAdapter } from "#providers/ai/adapters/gemini.adapter";
import { GroqAdapter } from "#providers/ai/adapters/groq.adapter";
import { OpenAIAdapter } from "#providers/ai/adapters/openai.adapter";

export class AiProviderFactory {
  static create(config) {
    const provider = (config.aiProvider).toLowerCase();

    switch (provider) {
      case "openai": {
        const apiKey = getAIApiKey("openai");
        const modelName = getAIModelName("openai", config);

        return new OpenAIAdapter(apiKey, modelName);
      }
      case "groq": {
        const apiKey = getAIApiKey("groq");
        const modelName = getAIModelName("groq", config);

        return new GroqAdapter(apiKey, modelName);
      }
      case "gemini": {
        const apiKey = getAIApiKey("gemini");
        const modelName = getAIModelName("gemini", config);

        return new GeminiAdapter(apiKey, modelName);
      }
      default:
        throw new Error(
          `Unsupported AI provider: ${provider}. Supported providers are: openai, groq, gemini.`
        );
    }
  }
}

function getAIApiKey(provider) {
  const providerNameUpperCase = provider.toUpperCase();
  const apiKey = process.env[`${providerNameUpperCase}_API_KEY`] ?? process.env.VIBE_GIT_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      `VIBE_GIT_AI_API_KEY must be set for the ${provider} provider.`
    );
  }

  return apiKey;
}

function getAIModelName(provider, config) {
  const modelName = config[`llm-${provider}-model`]?.modelName;

  if (!modelName) {
    throw new Error(
      `Model name for ${provider} must be set at vibe-git.config.`
    );
  }

  return modelName;
}
