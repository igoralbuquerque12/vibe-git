import { gitDiff, untrackedFiles } from "#services/git";
import { getConfigPath, readJson, saveMarkdown } from "#utils/filesystem";

import { generateCommitPlan as generateGeminiPlan } from "#services/gemini";
import { generateCommitPlan as generateOpenAIPlan } from "#services/openai";
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

    const filePath = `vibe-git/entry/${fileDestination}`;
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
    const branchLogic =
      branches.length > 0
        ? branches
            .map(
              b => `- BRANCH: "${b.branchName}" -> OBJECTIVE: ${b.description}`
            )
            .join("\n")
        : "- SINGLE BRANCH MODE: The user is on a single branch. Generate commits sequentially on it.";

    const userSummary = template.userSummary
      ? template.userSummary.map(item => `* ${item}`).join("\n")
      : "No summary provided by the user. Rely purely on the DIFF.";

    const commitConfig = config.commits || {};
    const commitLanguage = commitConfig.idioma || "en";

    const commitRules = commitConfig.useConventionalCommits
      ? `STRICTLY FOLLOW Conventional Commits. Allowed types: ${commitConfig.conventionalCommitTypes.join(", ")}. WRITE THE COMMIT MESSAGES IN: ${commitLanguage}.`
      : `DO NOT use Conventional Commits. Use natural and descriptive language for commit messages. WRITE THE COMMIT MESSAGES IN: ${commitLanguage}.`;

    const prConfig = config.PRs || {};
    let prInstruction =
      "DO NOT GENERATE SECTION 3 (PULL REQUEST DATA). Provide only the execution script.";

    if (prConfig.createPRs) {
      const prTemplateContent =
        prConfig.model && prConfig.model.trim() !== ""
          ? prConfig.model
          : "Create a professional summary yourself.";
      const prLanguage = prConfig.idioma || "en";

      prInstruction = `
        GENERATE SECTION 3: PULL REQUEST DATA.
        - CRITICAL RULE: If multiple branches are defined, you MUST generate a distinct Pull Request description FOR EACH BRANCH.
        - Language: ${prLanguage}
        - Template: ${prTemplateContent}
      `;
    }

    const fullPrompt = `
      ${context}

      ---
      COMMIT CONVENTIONS:
      ${commitRules}

      ---
      PR INSTRUCTIONS:
      ${prInstruction}

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
      FORMATTING RULES:
      ${outputFormatInstructions}

      ${obrigatoryInstructions}

      ---
      ANTI-BUG RULE (FILE-LEVEL ATOMICITY):
      1. 'git add' stages the entire file. 
      2. NEVER generate two separate commits for the same file in the same plan.
      3. If a file has multiple changes, group them into a single commit for that specific file.
      4. DO NOT group multiple distinct files unless they are absolutely inseparable.
    `;

    const provider = config.aiProvider || "gemini";
    let plan;

    if (provider === "openai") {
      logger.info(
        "🤖 OpenAI (ChatGPT) analyzing diff and generating atomic plan..."
      );
      plan = await generateOpenAIPlan(config, fullPrompt);
    } else {
      logger.info(
        "🤖 Gemini Architect analyzing diff and generating atomic plan..."
      );
      plan = await generateGeminiPlan(config, fullPrompt);
    }

    const exitName = template.exitName
      ? `${template.exitName}.md`
      : `plan-${Date.now()}.md`;
    const finalPath = await saveMarkdown("vibe-git/exit", exitName, plan);

    logger.success(`Atomic plan generated successfully at: ${finalPath}`);
  } catch (error) {
    logger.error(`Failed to execute vibe-git: ${error.message}`);
  }
}
