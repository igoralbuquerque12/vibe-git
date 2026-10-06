import {
  getCurrentBranch,
  getRepoInfo,
  gitDiff,
  untrackedFiles,
} from "#services/git";
import { getOpenPullRequest } from "#services/github";
import { buildRunPrompt } from "#builders/prompt";
import { parseJsonResponse } from "#parsers/ai-response";
import {
  ensureDir,
  exists,
  getConfigPath,
  readJson,
  saveJson,
  withFileExtension,
} from "#shared/filesystem";
import { systemPrompt } from "#constants/fixed-prompt";
import { formatTokenUsage, normalizeAiResponse } from "#providers/ai/ai-response";
import logger from "#shared/logger";
import path from "path";

export function mergePrHistory(branches, previousPlan, now = new Date()) {
  return (branches || []).map(newBranch => {
    const prevBranch = previousPlan?.branches?.find(
      b => b.branchName === newBranch.branchName
    );
    const prHistory = [...(prevBranch?.prHistory || [])];

    if (prevBranch?.pr) {
      prHistory.push({ ...prevBranch.pr, archivedAt: now.toISOString() });
    }

    return { ...newBranch, prHistory };
  });
}

export class GeneratePlanJsonUseCase {
  constructor(aiProvider) {
    this.aiProvider = aiProvider;
  }

  async execute({ fileDestination, flags = [] }) {
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

      const exitName = template.exitName
        ? withFileExtension(template.exitName, ".json")
        : `plan-${Date.now()}.json`;
      const targetDir = await ensureDir("vibe-git/exit");
      const filePath = path.join(targetDir, exitName);

      const ignoreHistory = flags.includes("--ignore-pr-history");

      let previousPlan = null;
      if (!ignoreHistory && (await exists(filePath))) {
        previousPlan = await readJson(filePath);
      }

      const githubPrs = {};
      if (!ignoreHistory) {
        try {
          const repoInfo = getRepoInfo();

          for (const branch of template.branches || []) {
            const remotePr = await getOpenPullRequest({
              owner: repoInfo.owner,
              repo: repoInfo.repo,
              branchName: branch.branchName,
            });

            if (remotePr) {
              githubPrs[branch.branchName] = { body: remotePr.body };
            }
          }
        } catch (error) {
          logger.dim(`Skipping GitHub PR history lookup: ${error.message}`);
        }
      }

      const prompt = buildRunPrompt({
        config,
        template,
        diff,
        untracked,
        previousPlan,
        githubPrs,
      });
      const response = normalizeAiResponse(
        await this.aiProvider.generateContent(prompt, systemPrompt)
      );
      const parsed = parseJsonResponse(response.content);

      const output = {
        generatedAt: new Date().toISOString(),
        sourceBranch: getCurrentBranch(),
        branches: mergePrHistory(parsed.branches, previousPlan),
      };

      await saveJson(filePath, output);
      logger.success(
        `Editable JSON plan generated at: ${filePath} (${formatTokenUsage(response.usage)})`
      );
    } catch (error) {
      logger.error(`Failed to generate JSON plan: ${error.message}`);
    }
  }
}
