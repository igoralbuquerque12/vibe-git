import { GeneratePlanMarkdownUseCase } from "#application/use-cases/generate-plan-markdown.uc";
import { AiProviderFactory } from "#providers/ai/ai.factory";
import { getConfigPath, readJson } from "#shared/filesystem";
import logger from "#shared/logger";

export async function plan(fileDestination) {
  try {
    const config = await readJson(getConfigPath());
    if (config?.disableWarns) {
      logger.setDisableWarns(true);
    }

    if (!config) {
      throw new Error("Config file not found: vibe-git.config.json");
    }

    const aiProvider = AiProviderFactory.create(config);
    const useCase = new GeneratePlanMarkdownUseCase(aiProvider);

    await useCase.execute({ fileDestination });
  } catch (error) {
    logger.error(`Failed to generate Markdown plan: ${error.message}`);
  }
}
