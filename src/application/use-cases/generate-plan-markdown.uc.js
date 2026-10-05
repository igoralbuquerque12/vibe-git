import { gitDiff, untrackedFiles } from "#services/git";
import { buildPlanPrompt } from "#builders/prompt";
import { systemPrompt } from "#constants/fixed-prompt";
import { formatTokenUsage, normalizeAiResponse } from "#providers/ai/ai-response";
import {
  getConfigPath,
  readJson,
  saveMarkdown,
  withFileExtension,
} from "#shared/filesystem";
import logger from "#shared/logger";

export class GeneratePlanMarkdownUseCase {
  constructor(aiProvider) {
    this.aiProvider = aiProvider;
  }

  async execute({ fileDestination }) {
    try {
      logger.success("🤖 Vibe-git Architect analyzing diff and generating atomic plan...");

      const config = await readJson(getConfigPath());
      if (config?.disableWarns) {
        logger.setDisableWarns(true);
      }

      if (!config) {
        throw new Error("Config file not found: vibe-git.config.json");
      }

      if (!fileDestination) {
        throw new Error("No template file provided.");
      }

      const templateFile = withFileExtension(fileDestination, ".json");
      const templatePath = `vibe-git/entry/${templateFile}`;
      const template = await readJson(templatePath);

      if (!template) {
        throw new Error(`Template file not found: ${templatePath}`);
      }

      const diff = gitDiff();
      const untracked = untrackedFiles();

      if (!diff && !untracked) {
        logger.info("No changes detected in the repository. Nothing to commit.");
        return;
      }

      const prompt = buildPlanPrompt({ config, template, diff, untracked });
      const response = normalizeAiResponse(
        await this.aiProvider.generateContent(prompt, systemPrompt)
      );

      const exitName = template.exitName
        ? `${template.exitName}.md`
        : `plan-${Date.now()}.md`;
      const finalPath = await saveMarkdown(
        "vibe-git/exit",
        exitName,
        response.content
      );

      logger.success(
        `Markdown plan generated at: ${finalPath} (${formatTokenUsage(response.usage)})`
      );
    } catch (error) {
      logger.error(`Failed to generate Markdown plan: ${error.message}`);
    }
  }
}
