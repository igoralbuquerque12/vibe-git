import readline from "readline/promises";
import chalk from "chalk"

import {
  checkoutBranch,
  checkoutNewBranch,
  getCurrentBranch,
  getRepoInfo,
  gitAdd,
  gitCommit,
  gitPush,
} from "#services/git";
import { createPullRequest } from "#services/github";
import { readJson } from "#shared/filesystem";
import logger from "#shared/logger";

function validatePlan(plan, ignorePR) {
  if (!plan?.branches || plan.branches.length === 0) {
    throw new Error("Invalid plan: must contain at least one branch.");
  }

  if (!ignorePR) {
    const branchesWithMissingBase = plan.branches.filter(b => b.pr && !b.pr.base);

    if (branchesWithMissingBase.length > 0) {
      const names = branchesWithMissingBase.map(b => b.branchName).join(", ");
      throw new Error(
        `The plan contains Pull Requests without a target branch (pr.base) in the following branches: ${names}.\n` +
        `Please edit the JSON file and fill the "base" field for each PR before executing.`
      );
    }
  }
}

async function stageFiles(files) {
  for (const file of files) {
    try {
      logger.info(`Staging: ${file}`);
      gitAdd(file);
    } catch {
      logger.warn(`Could not stage file (may not exist): ${file}`);
    }
  }
}

async function executeCommit(commit, index, total) {
  logger.step(`Commit ${index + 1}/${total}: "${commit.message}"`);
  await stageFiles(commit.files || []);

  try {
    gitCommit(commit.message);
    logger.success("Commit created.");
  } catch {
    logger.warn("Commit skipped (nothing staged or empty diff).");
  }
}

async function executeBranch(branch, index, total, { ignorePR, repoInfo }) {
  logger.step(`[Branch ${index + 1}/${total}] ${branch.branchName}`);

  try {
    logger.step(`Creating branch ${branch.branchName}...`);
    checkoutNewBranch(branch.branchName);
    logger.success("Branch created.");
  } catch {
    logger.warn(`Branch "${branch.branchName}" may already exist. Checking out...`);

    try {
      checkoutBranch(branch.branchName);
    } catch (error) {
      logger.error(
        `Could not checkout branch "${branch.branchName}": ${error.message}`
      );
      return;
    }
  }

  const commits = branch.commits || [];
  for (let i = 0; i < commits.length; i++) {
    await executeCommit(commits[i], i, commits.length);
  }

  try {
    logger.step(`Pushing ${branch.branchName}...`);
    gitPush(branch.branchName);
    logger.success("Branch pushed.");
  } catch (error) {
    logger.error(`Failed to push "${branch.branchName}": ${error.message}`);
  }

  if (branch.pr && !ignorePR) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await rl.question(
      chalk.yellow(`\nBranch "${branch.branchName}" has a PR defined. Do you want to create the PR now to ${branch.pr.base}? (y/n): `)
    );

    rl.close();

    if (answer.trim().toLowerCase() === "y") {
      try {
        logger.step(`Creating Pull Request for ${branch.branchName}...`);
        await createPullRequest({
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          title: branch.pr.title,
          body: branch.pr.body,
          head: branch.branchName,
          base: branch.pr.base,
        });
      } catch (error) {
        logger.error(`Failed to create PR: ${error.message}`);
      }
    } else {
      logger.info(`PR creation skipped for branch "${branch.branchName}". You can create it manually later.`);
    }
  }
}

export class ExecutePlanUseCase {
  async execute({ fileDestination, flags = [] }) {
    try {
      logger.success("🤖 Vibe-git Architect executing plan...");

      if (!fileDestination) {
        throw new Error("No plan file provided.");
      }

      const planPath = `vibe-git/exit/${fileDestination}`;
      const plan = await readJson(planPath);

      if (!plan) {
        throw new Error(`Plan file not found: ${planPath}`);
      }

      const ignorePR = flags.includes("--ignore-pr");
      validatePlan(plan, ignorePR);

      const sourceBranch = plan.sourceBranch || getCurrentBranch();
      const needsPR = plan.branches.some(branch => branch.pr) && !ignorePR;
      let repoInfo = null;

      if (needsPR) {
        repoInfo = getRepoInfo();
      }

      logger.step(`Starting execution of plan: ${fileDestination}`);
      logger.info(`Source branch: ${sourceBranch}`);
      logger.info(`Found ${plan.branches.length} branch(es) to process.`);

      for (let i = 0; i < plan.branches.length; i++) {
        await executeBranch(plan.branches[i], i, plan.branches.length, {
          ignorePR,
          repoInfo,
        });

        if (i == plan.branches.length - 1) {
          continue;
        } else {
          checkoutBranch(sourceBranch);
        }
      }

      logger.success(`All done! Returned to ${sourceBranch}.`);
    } catch (error) {
      logger.error(`Failed to execute plan: ${error.message}`);
    }
  }
}
