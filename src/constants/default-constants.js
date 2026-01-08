export const DEFAULT_CONFIG = {
  PRs: {
    createPRs: true,
    useModel: true,
    model:
      "# Description\nWrite a detailed description of the changes made to the code...\n\n# Justification\nExplain the reason for these changes and how they improve the project...\n\n# Impact\nDescribe any potential impact these changes may have.",
    idioma: "en",
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
    modelName: "gemini-2.0-flash",
  },
};

export const DEFAULT_ENTRY_TEMPLATE = {
  // (OPTIONAL) Defines the name of the output markdown file.
  // If omitted, the system generates a default name like "plan-<timestamp>.md".
  "exitName": "feature-auth-plan",

  // (OPTIONAL) A brief, bulleted summary of what you achieved.
  // Providing this context allows the AI to write much richer and deeper commit messages.
  "userSummary": [
    "Refactored password validation to use stronger Regex",
    "Created the 'Forgot Password' visual component",
    "Fixed a critical bug where JWT tokens were expiring too early"
  ],

  // (MANDATORY) Defines the structure of your changes.
  // You MUST provide at least one branch here. 
  // If you are working on a single branch, simply list it below.
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

