# vibe-git user manual

`vibe-git` is a CLI that reads the changes in your repository, asks an AI for a plan of atomic commits and, if you want, executes that plan: it creates the branches, makes the commits, pushes and opens the Pull Requests.

This manual is organized by command. For each one you will find the syntax, the arguments, the flags, what it reads, what it generates and the most common errors.

## Contents

- [Overview](#overview)
- [Before you start](#before-you-start)
- [`vibe-git init`](#vibe-git-init)
- [`vibe-git run`](#vibe-git-run)
- [`vibe-git plan`](#vibe-git-plan)
- [`vibe-git exec`](#vibe-git-exec)
- [Entry file](#entry-file)
- [Generated plan](#generated-plan)
- [Configuration](#configuration)
- [Environment variables](#environment-variables)
- [Complete workflows](#complete-workflows)
- [Troubleshooting](#troubleshooting)

## Overview

```text
vibe-git init
vibe-git run  <entry-file> [--ignore-pr-history]
vibe-git plan <entry-file>
vibe-git exec <exit-file>  [--ignore-pr] [--auto-create-pr]
```

| Command | What it is for | Changes Git? |
| --- | --- | --- |
| `init` | Creates the configuration and the workspace in the repository. | No |
| `run` | Generates an editable, executable JSON plan. | No |
| `plan` | Generates a Markdown plan with a Git script to run by hand. | No |
| `exec` | Executes a JSON plan: branches, commits, push and PRs. | **Yes** |

Rules that apply to every command:

- Always run from the root of the Git repository you want to process.
- The file name can be passed with or without `.json`: `vibe-git run example` and `vibe-git run example.json` are equivalent.
- Flags come **after** the file name.
- Calling `vibe-git` with no command, or with an unknown command, prints the usage summary.

## Before you start

You need:

- Node.js with native `fetch`.
- Git installed and a repository with the `origin` remote.
- An API key for Gemini, OpenAI or Groq.
- Push permission on the remote, if you are going to use `exec`.
- A GitHub token, if you want the Pull Requests to be created automatically.

Installation:

```bash
npm install -g @igoralbuquerque/vibe-git
```

---

## `vibe-git init`

Prepares the repository to use `vibe-git`.

```bash
vibe-git init
```

**Arguments:** none.
**Flags:** none.

### What it creates

| Path | Contents |
| --- | --- |
| `vibe-git.config.json` | AI provider, commit rules and PR rules. |
| `vibe-git/entry/example.json` | Example entry file. |
| `vibe-git/exit/` | Folder where the generated plans are saved. |
| `.env` | Receives the lines `VIBE_GIT_AI_API_KEY=` and `GITHUB_TOKEN=`. |
| `.gitignore` | Receives the line `vibe-git/`. |

### Caveats

- `vibe-git.config.json` and `vibe-git/entry/example.json` are **overwritten** on every run. If you have already customized these files, running `init` again erases your changes.
- `.env` and `.gitignore` are not overwritten: the command only appends the lines that do not exist yet.

### After `init`

1. Choose the provider in `vibe-git.config.json` (`aiProvider`).
2. Fill in the API key in `.env`.
3. Edit `vibe-git/entry/example.json` or create another file in the same folder.

---

## `vibe-git run`

Analyzes the changes in the repository and generates a **JSON** plan that can be reviewed, edited and then executed with `exec`.

```bash
vibe-git run <entry-file> [--ignore-pr-history]
```

### Arguments

| Argument | Required | Description |
| --- | --- | --- |
| `<entry-file>` | Yes | Name of a file inside `vibe-git/entry/`, with or without `.json`. |

### Flags

| Flag | Effect |
| --- | --- |
| `--ignore-pr-history` | Generates the plan from scratch. It does not look up open PRs on GitHub or the previous plan, and archives nothing in `prHistory`. |

### What it reads

- `vibe-git.config.json`.
- The entry file in `vibe-git/entry/`.
- The output of `git diff HEAD` (changes to files that are already tracked).
- The list of untracked files. Only the **names** of these files are sent to the AI, not their contents.

If there is no diff and there are no new files, the command reports that there is nothing to commit and exits.

### What it generates

A file in `vibe-git/exit/`:

- `<exitName>.json`, when the entry file defines `exitName`;
- `plan-<timestamp>.json`, when it does not.

At the end, the terminal shows the file path and the input, output and total token counts.

### Incremental PRs

By default, `run` does not write the PR description from scratch when one already exists. For each branch in the entry file, it looks for an existing PR body in this order:

1. **Open PR on GitHub** for the branch. Requires `GITHUB_TOKEN`; without the token, or if the lookup fails, this step is skipped without interrupting the command.
2. **Previous plan** at the same output path (`vibe-git/exit/<exitName>.json`).

When it finds a body, the AI is instructed to combine the existing text with the new changes, instead of discarding what was already described.

When a previous plan is overwritten, the old `pr` of each branch is kept in `prHistory`, with the date in `archivedAt`:

```json
{
  "branchName": "feat/auth",
  "pr": { "title": "feat(auth): ...", "body": "...", "base": "main" },
  "prHistory": [
    {
      "title": "feat(auth): previous version",
      "body": "...",
      "base": "main",
      "archivedAt": "2026-10-05T12:00:00.000Z"
    }
  ],
  "commits": []
}
```

History from the previous plan only works with `exitName` defined. Without it, each run generates a file with a new name and there is never a previous plan to read.

### Examples

```bash
# Generates the plan from vibe-git/entry/example.json
vibe-git run example

# Generates from scratch, ignoring PRs and previous plans
vibe-git run example --ignore-pr-history
```

### Common errors

| Message | Cause |
| --- | --- |
| `Config file not found: vibe-git.config.json` | The command was not run from the root, or `init` is missing. |
| `No template file provided.` | The entry file name is missing. |
| `Template file not found: vibe-git/entry/...` | The file does not exist in that folder or is not valid JSON. |
| `AI returned invalid JSON. Try running again.` | The AI response could not be parsed. Run again or switch models. |
| `VIBE_GIT_AI_API_KEY must be set for the ... provider.` | The API key is missing from `.env`. |

---

## `vibe-git plan`

Generates a **Markdown** plan, with the analysis and a Git script ready for you to run manually. It does not execute any Git command.

```bash
vibe-git plan <entry-file>
```

### Arguments

| Argument | Required | Description |
| --- | --- | --- |
| `<entry-file>` | Yes | Name of a file inside `vibe-git/entry/`, with or without `.json`. |

**Flags:** none.

### What it generates

A file `vibe-git/exit/<exitName>.md` (or `plan-<timestamp>.md`) with three sections:

1. **Analysis:** the dependency layers detected, in execution order.
2. **Execution script:** a block with `git checkout -b`, `git add`, `git commit` and `git push`.
3. **Pull Request data:** one description per branch. It only appears when `PRs.createPRs` is `true`.

### When to use `plan` instead of `run`

- You want to read and run the commands yourself.
- You only want a suggestion of how to split the commits.
- You do not want anything to be executed automatically.

The Markdown file cannot be passed to `exec`, which only accepts JSON plans.

### Example

```bash
vibe-git plan example
```

The errors are the same as for `run`, except for the invalid JSON error.

---

## `vibe-git exec`

Executes a JSON plan generated by `run`.

> **Warning:** this command runs real Git commands and pushes. Review the plan first.

```bash
vibe-git exec <exit-file> [--ignore-pr] [--auto-create-pr]
```

### Arguments

| Argument | Required | Description |
| --- | --- | --- |
| `<exit-file>` | Yes | Name of a plan inside `vibe-git/exit/`, with or without `.json`. |

### Flags

| Flag | Effect |
| --- | --- |
| `--ignore-pr` | Does not validate or create Pull Requests. Only branches, commits and push. `GITHUB_TOKEN` is not needed. |
| `--auto-create-pr` | Creates every PR in the plan without asking, or updates the ones that are already open. Intended for environments without an interactive terminal. |

If both flags are passed, `--ignore-pr` wins and no PR is created or updated.

With no flags, the command asks in the terminal, branch by branch, whether it should create the PR. Only the answer `y` creates it; anything else skips it.

If the branch already has an open PR on GitHub, `exec` does not try to create another one: the question becomes whether it should update the existing PR, and the answer `y` changes only its title and body with the plan's `pr.title` and `pr.body`. The target branch of the open PR is not changed.

### What it does

For each branch in the plan, in this order:

1. Creates the branch with `git checkout -b`. If it already exists, checks it out.
2. For each commit: runs `git add` on each listed file and then `git commit` with the message from the plan.
3. Runs `git push origin <branch>`.
4. If the branch has a `pr` and `--ignore-pr` was not passed, creates the Pull Request or, if the branch already has an open PR, updates its title and body (with or without confirmation).
5. Returns to the plan's `sourceBranch` before starting the next branch.

After the last branch the command does not switch branches: you end up on the last branch processed.

### How it handles failures

`exec` does not stop at the first failure. It records the problem and moves on:

| Situation | Behavior |
| --- | --- |
| A file could not be added | Warning; the commit continues with the remaining files. |
| Commit with nothing to commit | Warning; the commit is skipped. |
| Push failed | Error in the terminal; execution moves on to the PR and to the next branch. |
| Branch checkout failed | Error in the terminal; the whole branch is skipped. |
| PR creation or update failed | Error in the terminal; execution moves on to the next branch. |

For that reason, read the output to the end before considering the execution complete.

### Validations before executing

The command aborts everything, without touching Git, when:

- the plan has no branches;
- a branch has a `pr` without `pr.base` (unless `--ignore-pr` is used).

### Checklist before running

- Every file path exists and appears in a single commit.
- The branch names and commit messages are correct.
- Every `pr` has `base` filled in.
- `sourceBranch` is the branch the new branches should start from.
- `GITHUB_TOKEN` is in `.env`, if you are going to create PRs.

### Examples

```bash
# Executes and asks about each PR
vibe-git exec feature-auth-plan

# Only branches, commits and push
vibe-git exec feature-auth-plan --ignore-pr

# Creates every PR without asking
vibe-git exec feature-auth-plan --auto-create-pr
```

### Common errors

| Message | Cause |
| --- | --- |
| `No plan file provided.` | The plan name is missing. |
| `Plan file not found: vibe-git/exit/...` | The plan does not exist in that folder or is not valid JSON. |
| `Invalid plan: must contain at least one branch.` | The plan has no `branches`. |
| `The plan contains Pull Requests without a target branch (pr.base)...` | Fill in `pr.base` on each branch or use `--ignore-pr`. |
| `GITHUB_TOKEN is not set in environment variables.` | Add the token to `.env` or use `--ignore-pr`. |
| `Could not parse GitHub owner/repo from remote URL.` | The `origin` remote is not a GitHub repository. |

---

## Entry file

`run` and `plan` read a JSON file from `vibe-git/entry/`.

```json
{
  "exitName": "feature-auth-plan",
  "prBase": "main",
  "userSummary": [
    "Implemented JWT authentication",
    "Created the login screen"
  ],
  "branches": [
    {
      "branchName": "feat/auth",
      "description": "Authentication infrastructure and login screen"
    }
  ]
}
```

| Field | Required | Description |
| --- | --- | --- |
| `exitName` | No | Name of the output file, without extension. Without it, the name is `plan-<timestamp>`. |
| `prBase` | No | Target branch of the PRs. Without it, fill in `pr.base` in the plan before `exec`. |
| `userSummary` | No | List of what you did, in natural language. Gives the AI context. |
| `branches` | Recommended | Desired branches. If empty or absent, the AI plans a single branch. |
| `branches[].branchName` | Yes, if using `branches` | Exact name of the branch. |
| `branches[].description` | Yes, if using `branches` | Purpose and scope of the branch. |

## Generated plan

Structure of the JSON produced by `run`:

```json
{
  "generatedAt": "2026-10-05T12:00:00.000Z",
  "sourceBranch": "main",
  "branches": [
    {
      "branchName": "feat/auth",
      "description": "Authentication infrastructure",
      "pr": {
        "title": "feat(auth): add authentication infrastructure",
        "body": "# Description\n...",
        "base": "main"
      },
      "prHistory": [],
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

| Field | Description |
| --- | --- |
| `generatedAt` | Date the plan was generated. |
| `sourceBranch` | Branch you were on when you ran `run`. `exec` returns to it between branches. |
| `branches[].pr` | PR data. Absent when `PRs.createPRs` is `false`. |
| `branches[].prHistory` | Previous versions of the `pr`, filled in by the CLI itself. |
| `branches[].commits` | Commits in the order in which they will be created. |

The plan is meant to be edited: you can change messages, move files between commits, remove commits or rewrite the PR before running `exec`.

## Configuration

`vibe-git.config.json`:

| Key | Values | Description |
| --- | --- | --- |
| `aiProvider` | `gemini`, `openai`, `groq` | AI provider. |
| `disableWarns` | `true`, `false` | Hides the terminal warnings. |
| `commits.useConventionalCommits` | `true`, `false` | Requires Conventional Commits. |
| `commits.conventionalCommitTypes` | List of strings | Allowed types (`feat`, `fix`, ...). |
| `commits.idioma` | `en`, `pt-BR`, ... | Language of the commit messages. |
| `PRs.createPRs` | `true`, `false` | Includes or omits the PR data in the plans. |
| `PRs.model` | Markdown | Template the AI follows to write the PR. |
| `PRs.idioma` | `en`, `pt-BR`, ... | Language of the PR content. |
| `llm-gemini-model.modelName` | Model name | Model used with Gemini. |
| `llm-openai-model.modelName` | Model name | Model used with OpenAI. |
| `llm-groq-model.modelName` | Model name | Model used with Groq. |

## Environment variables

Defined in the `.env` at the repository root:

| Variable | Use |
| --- | --- |
| `VIBE_GIT_AI_API_KEY` | Shared API key, used by any provider. |
| `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY` | Provider-specific key. Takes precedence over the shared one. |
| `GITHUB_TOKEN` | Creating PRs in `exec` and looking up open PRs in `run`. |

For `GITHUB_TOKEN`, use a *fine-grained* token restricted to the repositories you need, with the **Pull requests: Read and write** permission. Never commit `.env`.

The token is only used for the GitHub API. The push still uses your Git credentials.

## Complete workflows

### Automatic, with PRs

```bash
vibe-git init
# edit vibe-git.config.json, .env and vibe-git/entry/example.json
vibe-git run example
# review vibe-git/exit/feature-auth-plan.json
vibe-git exec feature-auth-plan
```

### Commits and push only

```bash
vibe-git run example
vibe-git exec feature-auth-plan --ignore-pr
```

### Without an interactive terminal

```bash
vibe-git run example
vibe-git exec feature-auth-plan --auto-create-pr
```

### Manual, from the Markdown

```bash
vibe-git plan example
# open vibe-git/exit/feature-auth-plan.md and run the commands you want
```

### Updating a PR that already exists

```bash
# new changes on the same branch
vibe-git run example
# the new pr.body starts from the body of the open PR or of the previous plan

vibe-git exec feature-auth-plan
# the new commits are pushed to the branch and the open PR gets the new title and body
```

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `Config file not found` | Run `vibe-git init` at the repository root. |
| `No changes detected in the repository` | There is no diff and there are no new files. |
| `AI returned invalid JSON` | Run `run` again or use a model that is more reliable at JSON. |
| `LLM request failed (attempt x/3)` | The AI call failed. Up to three attempts are made, five seconds apart. |
| `Unsupported AI provider` | `aiProvider` must be `gemini`, `openai` or `groq`. |
| `Model name for ... must be set` | `llm-<provider>-model.modelName` is missing from the configuration. |
| PR without a target branch | Set `prBase` in the entry file or edit `pr.base` in the plan. |
| Push fails | Check the `origin` remote, the permissions and your Git credentials. |
| GitHub API returns `403` | The token needs access to the repository and write permission on Pull Requests. |
| The PR description does not reuse the previous one | Check `GITHUB_TOKEN`, `exitName` and that `--ignore-pr-history` was not passed. |
