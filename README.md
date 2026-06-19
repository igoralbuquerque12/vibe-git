# vibe-git

An AI-powered CLI that turns your repository changes into an atomic commit plan, executes the plan, pushes branches, and optionally creates Pull Requests.

## What It Does

`vibe-git` reads the current Git diff and untracked files, sends that context to your selected AI provider, and produces one of two outputs:

- An editable JSON plan that can be executed automatically.
- A Markdown plan with a ready-to-run Git script for manual execution.

The automatic workflow can:

- Split changes into one or more branches.
- Group files into atomic commits.
- Create commits in dependency order.
- Push each branch to `origin`.
- Create Pull Requests through the GitHub API.

> [!WARNING]
> `vibe-git exec` runs real Git commands. Always review the generated JSON plan before executing it.

## Requirements

- Node.js with native `fetch` support.
- Git installed and a repository with an `origin` remote.
- An API key for Gemini, OpenAI, or Groq.
- Push access to the remote repository when using `vibe-git exec`.
- A GitHub token when creating Pull Requests automatically.

## Installation

Install globally from npm:

```bash
npm install -g @igoralbuquerque/vibe-git
```

For local development:

```bash
git clone https://github.com/igoralbuquerque12/vibe-git.git
cd vibe-git
npm install
npm link
```

## Quick Start

Run these commands from the root of the Git repository you want to process.

### 1. Initialize the workspace

```bash
vibe-git init
```

This creates:

```text
vibe-git.config.json       AI provider, commit, and PR preferences
.env                       API keys and GitHub token
vibe-git/entry/example.json
vibe-git/exit/
```

The generated `vibe-git/` directory is added to `.gitignore`.

### 2. Configure an AI provider

Set the provider in `vibe-git.config.json`:

```json
{
  "aiProvider": "gemini"
}
```

Then add its API key to `.env`. You can use the shared variable:

```env
VIBE_GIT_AI_API_KEY=your-provider-api-key
```

Or a provider-specific variable:

```env
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
GROQ_API_KEY=your-groq-key
```

When both are present, the provider-specific variable takes precedence.

### 3. Describe your changes

Edit `vibe-git/entry/example.json`:

```json
{
  "exitName": "feature-auth-plan",
  "prBase": "main",
  "userSummary": [
    "Implemented JWT authentication",
    "Created a login screen"
  ],
  "branches": [
    {
      "branchName": "feat/auth",
      "description": "Authentication infrastructure and login UI"
    }
  ]
}
```

### 4. Generate and review an executable plan

```bash
vibe-git run example.json
```

This generates `vibe-git/exit/feature-auth-plan.json`. Review and edit that file before continuing.

### 5. Execute the plan

```bash
vibe-git exec feature-auth-plan.json
```

For every branch in the plan, `exec` creates or checks out the branch, stages the listed files, commits them, pushes the branch, and asks whether to create its Pull Request.

## CLI Reference

```text
vibe-git init
vibe-git run <entry-file.json>
vibe-git plan <entry-file.json>
vibe-git exec <exit-file.json> [--ignore-pr] [--auto-create-pr]
```

Running `vibe-git` without a valid command prints this usage summary.

| Command | Parameters | Result |
| --- | --- | --- |
| `vibe-git init` | None | Creates the config, `.env`, and `vibe-git/entry` and `vibe-git/exit` workspace. Existing generated config and example files are overwritten. |
| `vibe-git run <entry-file.json>` | Required entry filename | Generates an editable JSON execution plan in `vibe-git/exit/`. |
| `vibe-git plan <entry-file.json>` | Required entry filename | Generates a Markdown analysis and Git script in `vibe-git/exit/`. It does not execute Git commands. |
| `vibe-git exec <exit-file.json>` | Required exit filename; optional flags below | Executes an existing JSON plan from `vibe-git/exit/`. |

### `exec` flags

| Flag | Behavior |
| --- | --- |
| `--ignore-pr` | Skips all Pull Request validation and creation. No `GITHUB_TOKEN` is required. |
| `--auto-create-pr` | Creates every PR defined in the plan without asking for confirmation. Useful in non-interactive environments. |

Flags must be placed after the plan filename:

```bash
vibe-git exec feature-auth-plan.json --ignore-pr
vibe-git exec feature-auth-plan.json --auto-create-pr
```

If both flags are provided, `--ignore-pr` takes precedence and no Pull Request is created.

## Entry File Reference

Commands `run` and `plan` read a JSON file from `vibe-git/entry/`.

| Field | Required | Description |
| --- | --- | --- |
| `exitName` | No | Output filename without extension. When omitted, a timestamped `plan-<timestamp>` name is used. |
| `prBase` | No | Base branch inserted into generated Pull Requests. If omitted, fill each generated `pr.base` before running `exec`. |
| `userSummary` | No | List of human-readable changes that gives the AI additional context. |
| `branches` | Recommended | Desired branch names and their purpose. When empty or omitted, the AI is instructed to use a single-branch plan. |
| `branches[].branchName` | Yes, when `branches` is used | Exact branch name to generate in the plan. |
| `branches[].description` | Yes, when `branches` is used | Purpose and scope of the branch. |

## Executable Plan Reference

The `run` command generates a JSON file with this structure:

```json
{
  "generatedAt": "2026-06-11T12:00:00.000Z",
  "sourceBranch": "main",
  "branches": [
    {
      "branchName": "feat/auth",
      "description": "Authentication infrastructure",
      "pr": {
        "title": "feat(auth): add authentication infrastructure",
        "body": "# Summary\n...",
        "base": "main"
      },
      "commits": [
        {
          "message": "feat(auth): add token service",
          "files": ["src/services/token.js"]
        }
      ]
    }
  ]
}
```

Before using `exec`, verify:

- Every file path exists and appears in only one commit.
- Commit and branch names are correct.
- Every Pull Request has a valid `pr.base`.
- The source branch and remote repository are correct.

The `pr` object is omitted when `PRs.createPRs` is `false`.

## Configuration Reference

`vibe-git.config.json` controls generation behavior.

| Setting | Accepted values | Description |
| --- | --- | --- |
| `aiProvider` | `gemini`, `openai`, `groq` | Selects the AI adapter. |
| `disableWarns` | `true`, `false` | Hides warning-level terminal messages when enabled. |
| `commits.useConventionalCommits` | `true`, `false` | Enables Conventional Commit messages. |
| `commits.conventionalCommitTypes` | Array of strings | Types the AI may use when Conventional Commits are enabled. |
| `commits.idioma` | Language string such as `en` or `pt-BR` | Language used for commit messages. |
| `PRs.createPRs` | `true`, `false` | Includes or omits PR data in generated plans. |
| `PRs.model` | Markdown string | Template the AI follows when writing PR descriptions. |
| `PRs.idioma` | Language string such as `en` or `pt-BR` | Language used for PR content. |
| `llm-gemini-model.modelName` | Gemini model name | Model used by the Gemini adapter. |
| `llm-openai-model.modelName` | OpenAI model name | Model used by the OpenAI adapter. |
| `llm-groq-model.modelName` | Groq model name | Model used by the Groq adapter. |

## Creating a GitHub Token

`GITHUB_TOKEN` is only needed when `exec` creates Pull Requests. GitHub recommends fine-grained personal access tokens with the minimum required permissions.

1. Open [GitHub Settings > Developer settings > Personal access tokens > Fine-grained tokens](https://github.com/settings/personal-access-tokens).
2. Select **Generate new token**.
3. Enter a descriptive name and choose a short expiration period.
4. Under **Resource owner**, select the account or organization that owns the repository.
5. Under **Repository access**, select only the repositories that `vibe-git` should access.
6. Under **Repository permissions**, set **Pull requests** to **Read and write**.
7. Select **Generate token**, copy it immediately, and add it to the project `.env`:

```env
GITHUB_TOKEN=github_pat_your_token
```

Organizations may require approval before a fine-grained token can access their repositories. See GitHub's guides for [managing personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) and the [Create a pull request API permission](https://docs.github.com/en/rest/pulls/pulls#create-a-pull-request).

> [!IMPORTANT]
> Never commit `.env` or share its values. The token authenticates PR creation through the GitHub API; pushing branches still uses your existing Git credentials.

## Automatic Workflow Details

`vibe-git exec` performs the following operations for each branch:

1. Runs `git checkout -b "<branch>"`, or checks out the branch if it already exists.
2. Runs `git add "<file>"` for every file in each commit.
3. Runs `git commit -m "<message>"`.
4. Runs `git push origin "<branch>"`.
5. Optionally creates the configured Pull Request.

Between branches, it checks out the plan's `sourceBranch`. Use `--ignore-pr` when you only want branches, commits, and pushes.

## Classic Markdown Workflow

Use `plan` when you want AI-generated guidance without automatic execution:

```bash
vibe-git plan example.json
```

The command creates `vibe-git/exit/<exitName>.md` containing:

- A concise dependency-layer analysis.
- A Git execution script.
- Pull Request content when enabled in the config.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `Config file not found` | Run `vibe-git init` from the repository root. |
| `No template file provided` | Pass a filename that exists inside `vibe-git/entry/`. |
| `AI returned invalid JSON` | Run `vibe-git run` again or switch to a model that reliably returns JSON. |
| `Pull Requests without a target branch` | Set `prBase` in the entry file or edit every generated `pr.base`. |
| `GITHUB_TOKEN is not set` | Add the token to `.env`, or execute with `--ignore-pr`. |
| Push fails | Confirm `origin`, branch permissions, and your Git credentials. |
| GitHub API returns `403` | Confirm the token can access the repository and has **Pull requests: Read and write** permission. |

## Development

```bash
npm install
npm test
node bin/cli.js init
```

The project uses ES Modules, the native Node.js test runner, and `#...` import aliases mapped to `src/`.

## License

[MIT](LICENSE)
