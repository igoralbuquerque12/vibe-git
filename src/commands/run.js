import { gitDiff, untrackedFiles } from "#services/git";
import { getConfigPath, readJson, saveMarkdown } from "#utils/filesystem";
import { generateCommitPlan } from "#services/gemini";

import {
  context,
  obrigatoryInstructions,
  outputFormatInstructions,
} from "#constants/fixed-prompt";
import logger from "#utils/logger";

export async function run(fileDestination) {
  try {
    const configPath = getConfigPath();
    const config = await readJson(configPath);

    if (!fileDestination) {
      throw new Error("No destination file provided...");
    }

    const filePath = `gen-commit/entry/${fileDestination}`;
    const template = await readJson(filePath);
    if (!template) {
      throw new Error(`Template file not found: ${filePath}`);
    }

    const diff = gitDiff();
    const untracked = untrackedFiles();

    if (!diff && !untracked) {
      logger.info("No changes detected in the repository. Nothing to commit.");
      return;
    }

    const branches = template.branches || [];
    const branchLogic = branches.length > 0
      ? branches.map((b) => `- BRANCH: "${b.branchName}" -> OBJECTIVE: ${b.description}`).join("\n")
      : "- SINGLE BRANCH MODE: The user is on a single branch. Generate commits sequentially on it.";

    const userSummary = template.userSummary
      ? template.userSummary.map(item => `* ${item}`).join("\n")
      : "No summary provided by the user. Rely purely on the DIFF.";

    const prConfig = config.PRs || {};
    let prTemplateContent = "";
    let prLanguage = "en";

    if (prConfig.createPRs) {
      prTemplateContent = (prConfig.model && prConfig.model.trim() !== "")
        ? prConfig.model
        : "No template provided. Create a comprehensive model yourself.";
      prLanguage = prConfig.idioma || "en";
    }

    const fullPrompt = `
      ${context}

      ---
      DEVELOPER CONTEXT (Summary of work done):
      ${userSummary}

      ---
      DESIRED BRANCH STRUCTURE:
      ${branchLogic}

      ---
      TECHNICAL DATA (Git):
      DIFF:
      ${diff}

      UNTRACKED FILES:
      ${untracked}

      ---
      FORMATTING AND PR RULES:
      ${outputFormatInstructions}

      PR CONFIG:
      - Language: ${prLanguage}
      - Template: ${prTemplateContent}

      ${obrigatoryInstructions}
    `;

    logger.info("🤖 Gemini Architect analyzing diff and generating atomic plan...");
    const plan = await generateCommitPlan(config, fullPrompt);

    const exitName = template.exitName
      ? `${template.exitName}.md`
      : `plan-${Date.now()}.md`;
    const finalPath = await saveMarkdown("gen-commit/exit", exitName, plan);

    logger.success(
      `Atomic plan generated successfully at: ${finalPath}`
    );
  } catch (error) {
    logger.error(`Failed to execute gen-commit: ${error.message}`);
  }
}