import {
  context,
  jsonOutputInstructions,
  obrigatoryInstructions,
  outputFormatInstructions,
} from "#constants/fixed-prompt";

const ANTI_BUG_RULES = `
ANTI-BUG RULE (FILE-LEVEL ATOMICITY):
1. 'git add' stages the entire file.
2. NEVER generate two separate commits for the same file in the same plan.
3. If a file has multiple changes, group them into a single commit for that specific file.
4. DO NOT group multiple distinct files unless they are absolutely inseparable.
`.trim();

function formatBranchLogic(branches) {
  if (!branches || branches.length === 0) {
    return "- SINGLE BRANCH MODE: The user is on a single branch. Generate commits sequentially on it.";
  }

  return branches
    .map(b => `- BRANCH: "${b.branchName}" -> OBJECTIVE: ${b.description}`)
    .join("\n");
}

function formatUserSummary(userSummary) {
  if (!userSummary || userSummary.length === 0) {
    return "No summary provided by the user. Rely purely on the DIFF.";
  }

  return userSummary.map(item => `* ${item}`).join("\n");
}

function formatCommitRules(commitConfig) {
  const language = commitConfig.idioma || "en";

  if (commitConfig.useConventionalCommits) {
    const types = (commitConfig.conventionalCommitTypes || []).join(", ");
    return `STRICTLY FOLLOW Conventional Commits. Allowed types: ${types}. WRITE THE COMMIT MESSAGES IN: ${language}.`;
  }

  return `DO NOT use Conventional Commits. Use natural and descriptive language for commit messages. WRITE THE COMMIT MESSAGES IN: ${language}.`;
}

function formatMarkdownPrInstructions(prConfig) {
  if (!prConfig.createPRs) {
    return "DO NOT GENERATE SECTION 3 (PULL REQUEST DATA). Provide only the execution script.";
  }

  const template =
    prConfig.model?.trim() || "Create a professional summary yourself.";
  const language = prConfig.idioma || "en";

  return `
GENERATE SECTION 3: PULL REQUEST DATA.
- CRITICAL RULE: If multiple branches are defined, you MUST generate a distinct Pull Request description FOR EACH BRANCH.
- Language: ${language}
- Template: ${template}`.trim();
}

function formatJsonPrInstructions(prConfig, templatePrBase) {
  if (!prConfig.createPRs) {
    return 'DO NOT include the "pr" field in any branch object. PRs were NOT requested.';
  }

  const template = prConfig.model?.trim() || "Create a professional summary yourself.";
  const language = prConfig.idioma || "en";

  const baseInstruction = templatePrBase && templatePrBase.trim() !== ""
    ? `"${templatePrBase}"`
    : `"" (empty string)`;

  return `
INCLUDE the "pr" field in each branch object.
- "pr.title": Conventional commit style title (e.g. feat(scope): summary).
- "pr.body": Full PR body following this template: ${template}
- "pr.base": ${baseInstruction}
- Language for PR content: ${language}
- CRITICAL: Each branch MUST have its own distinct PR data.`.trim();
}

function assemblePrompt({
  branchLogic,
  commitRules,
  diff,
  formatInstructions,
  prInstructions,
  untracked,
  userSummary,
}) {
  return `
${context}

---
COMMIT CONVENTIONS:
${commitRules}

---
PR INSTRUCTIONS:
${prInstructions}

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
${formatInstructions}

${obrigatoryInstructions}

---
${ANTI_BUG_RULES}
`.trim();
}

export function buildPlanPrompt({ config, template, diff, untracked }) {
  const commitConfig = config.commits || {};
  const prConfig = config.PRs || {};

  return assemblePrompt({
    branchLogic: formatBranchLogic(template.branches),
    commitRules: formatCommitRules(commitConfig),
    diff,
    formatInstructions: outputFormatInstructions,
    prInstructions: formatMarkdownPrInstructions(prConfig),
    untracked,
    userSummary: formatUserSummary(template.userSummary),
  });
}

export function buildRunPrompt({ config, template, diff, untracked }) {
  const commitConfig = config.commits || {};
  const prConfig = config.PRs || {};

  return assemblePrompt({
    branchLogic: formatBranchLogic(template.branches),
    commitRules: formatCommitRules(commitConfig),
    diff,
    formatInstructions: jsonOutputInstructions,
    prInstructions: formatJsonPrInstructions(prConfig, template.prBase),
    untracked,
    userSummary: formatUserSummary(template.userSummary),
  });
}
