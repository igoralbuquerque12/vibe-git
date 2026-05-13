import {
  getCurrentBranch,
  gitDiff,
  untrackedFiles,
} from "#services/git";
import { buildRunPrompt } from "#builders/prompt";
import { parseJsonResponse } from "#parsers/ai-response";
import {
  ensureDir,
  getConfigPath,
  readJson,
  saveJson,
} from "#shared/filesystem";
import logger from "#shared/logger";
import path from "path";

export class GeneratePlanJsonUseCase {
  constructor(aiProvider) {
    this.aiProvider = aiProvider;
  }

  async execute({ fileDestination }) {
    try {
      logger.success("🤖 Vibe-git Architect analyzing diff and generating json plan...");

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

      const templatePath = `vibe-git/entry/${fileDestination}`;
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

      const prompt = buildRunPrompt({ config, template, diff, untracked });
      const rawResponse = await this.aiProvider.generateContent(prompt);
      const parsed = parseJsonResponse(rawResponse);

      const output = {
        generatedAt: new Date().toISOString(),
        sourceBranch: getCurrentBranch(),
        branches: parsed.branches,
      };

      const exitName = template.exitName
        ? `${template.exitName}.json`
        : `plan-${Date.now()}.json`;
      const targetDir = await ensureDir("vibe-git/exit");
      const filePath = path.join(targetDir, exitName);

      await saveJson(filePath, output);
      logger.success(`Editable JSON plan generated at: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to generate JSON plan: ${error.message}`);
    }
  }
}
