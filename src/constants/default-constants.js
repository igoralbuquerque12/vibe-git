export const DEFAULT_CONFIG = {
  _aiProvider_info: "Options: 'gemini' | 'openai' | 'groq'",
  aiProvider: "gemini",
  disableWarns: false,

  PRs: {
    createPRs: true,
    useModel: true,
    model:
      "# Description\nWrite a detailed description...\n\n# Justification\nExplain the reason...",
    idioma: "en",
    prBase: "main",
  },

  commits: {
    useConventionalCommits: true,
    conventionalCommitTypes: [
      "feat",
      "fix",
      "docs",
      "style",
      "refactor",
      "perf",
      "test",
      "chore",
    ],
    idioma: "en",
  },

  "llm-gemini-model": {
    modelName: "gemini-2.5-flash",
  },
  "llm-openai-model": {
    modelName: "gpt-4o",
  },
  "llm-groq-model": {
    modelName: "llama-3.3-70b-versatile",
  },
};

export const DEFAULT_ENTRY_TEMPLATE = {
  "_exitName": "(OPTIONAL) Defines the name of the output markdown file. If omitted, the system generates a default name like 'plan-<timestamp>.md'.",
  "exitName": "feature-auth-plan",

  "_prBase": "(OPTIONAL) The target branch for your Pull Requests. If left empty, you MUST fill 'pr.base' in the generated JSON before executing.",
  "prBase": "main",

  "_userSummary": "(OPTIONAL) A brief, bulleted summary of what you achieved. Providing this context allows the AI to write much richer and deeper commit messages.",
  "userSummary": [
    "Refactored password validation to use stronger Regex",
    "Created the 'Forgot Password' visual component",
    "Fixed a critical bug where JWT tokens were expiring too early"
  ],

  "_branches": "(MANDATORY) Defines the structure of your changes. You MUST provide at least one branch here. If you are working on a single branch, simply list it below.",
  "branches": [
    {
      "branchName": "NOS-4000",
      "description": "Authentication infrastructure fixes (JWT fix)"
    },
    {
      "branchName": "NOS-4001",
      "description": "Implementation of password security rules"
    },
    {
      "branchName": "NOS-4002",
      "description": "Password recovery Frontend"
    }
  ]
}

