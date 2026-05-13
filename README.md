# vibe-git 🚀

Your intelligent CLI for orchestrating commits and Pull Requests autonomously.

Turn an entire day of chaotic coding into a clean, atomic Git history with automatically generated Pull Requests.

---

# 🎯 What is vibe-git?

**vibe-git** is not just a commit message generator.  
It is a **Software Architect** and a **Git Agent** living inside your terminal.

After hours of coding — with changes spread across database, backend, frontend, and configs — you simply describe what you did.

Then, **vibe-git** takes over:

- Analyzes the full repository diff
- Detects real technical dependencies (e.g. database schema → controller → UI)
- Designs an atomic commit strategy grouping the correct files
- **(New)** Automatically executes commits, splitting work into multiple branches if needed
- **(New)** Opens Pull Requests directly on GitHub with rich, formatted documentation

---

# 🤔 Why use vibe-git instead of IDE agents (Copilot/Cursor)?

| IDE Agents | vibe-git |
|---|---|
| Limited to the currently opened file | Understands the entire repository flow |
| Often mixes unrelated changes into a single commit | Creates atomic and reversible commits |
| Weak Git orchestration | Full Git workflow automation |
| Manual PR creation | Automatically creates rich Pull Requests |
| Higher token usage | Cheaper and easier to test using Gemini Flash or Groq |

---

# 🆚 Before vs After

| Traditional Workflow | vibe-git (Autonomous) |
|---|---|
| `git add .` | `Commit 1: chore(deps): install prisma` |
| `git commit -m "implemented auth and fixed bugs"` | `Commit 2: feat(db): add user schema` |
| Huge mixed commits | `Commit 3: feat(api): auth controller` |
| Hard to revert safely | `Commit 4: feat(ui): login form` |
| Manual PR descriptions | GitHub PR generated automatically |

✅ Atomic and reversible commits  
✅ Structured PR generation  
✅ Human-in-the-loop review before execution

---

# 🛠️ Installation & Setup

## 1. Installation

We recommend installing globally via npm:

```bash
npm install -g @igoralbuquerque/vibe-git
```

---

## 2. Initialization

Inside your project root (where the `.git` folder exists), run:

```bash
vibe-git init
```

This creates the base structure:

```txt
vibe-git.config.json   → Your preferences (language, AI provider, conventions)
.env                   → API keys and secrets
vibe-git/              → Internal workspace (auto-added to .gitignore)
```

---

## 3. Configure Providers

Open the generated `.env` file and add your credentials:

```env
# Concentrate any provider key here
VIBE_GIT_AI_API_KEY=sk-groq/gemini/openai-key

# Or use the provider's key directly
GEMINI_API_KEY=sk-your-key-here
OPENAI_API_KEY=sk-your-key-here
GROQ_API_KEY=sk-your-key-here

# Optional but recommended (for automatic PR creation)
GITHUB_TOKEN=ghp_your_token_here
```

Then, inside `vibe-git.config.json`, choose the active provider:

```json
{
  "aiProvider": "gemini"
}
```

Available options:

- `gemini`
- `openai`
- `groq`

---

# 🔄 Workflows: V2 vs V1

vibe-git now supports two workflows:

- **Autonomous Workflow (Recommended)**
- **Classic Markdown Workflow**

---

# 🌟 Autonomous Workflow (V2)

In this flow, the AI generates a structured JSON plan.  
You review it, then the CLI executes everything automatically.

---

## Step 1 — Describe the Work

Edit `vibe-git/entry/example.json`:

```json
{
  "exitName": "my-plan",
  "prBase": "develop",
  "userSummary": [
    "Implemented JWT authentication",
    "Created login screen"
  ],
  "branches": [
    {
      "branchName": "feat/auth",
      "description": "Authentication infrastructure and login UI"
    }
  ]
}
```

---

## Step 2 — Generate the Structured Plan

Run:

```bash
vibe-git run example.json
```

This generates:

```txt
vibe-git/exit/my-plan.json
```

You can freely edit commit names, PR text, or descriptions before execution.

---

## Step 3 — Execute the Plan

Run:

```bash
vibe-git exec my-plan.json
```

The CLI will:

- Create the branch
- Group files logically
- Execute `git add` automatically
- Create commits with generated messages
- Push the branch
- Ask interactively whether to create the Pull Request

Example:

```txt
⚠️ Do you want to create the Pull Request now? (y/N)
```

If confirmed, the PR is automatically created on GitHub.

---

### Skip PR creation

```bash
vibe-git exec my-plan.json --ignore-pr
```

---

# 📜 Classic Markdown Workflow (V1)

Prefer reading the AI analysis and manually executing commands?

Use:

```bash
vibe-git plan example.json
```

This generates a readable Markdown file:

```txt
my-plan.md
```

Containing:

- AI analysis
- Commit strategy
- Ready-to-run bash script

---

# ⚙️ Advanced Configuration (`vibe-git.config.json`)

vibe-git is highly customizable.

Example:

```json
{
  "aiProvider": "gemini",
  "disableWarns": false,
  "commits": {
    "useConventionalCommits": true
  },
  "PRs": {
    "createPRs": true,
    "model": ""
  }
}
```

---

## Available Settings

### `aiProvider`

Switch between:

- `gemini`
- `openai`
- `groq`

---

### `disableWarns`

Set to `true` to hide minor terminal warnings.

---

### `commits.useConventionalCommits`

Forces the AI to follow conventional commit standards:

```txt
feat:
fix:
refactor:
docs:
```

---

### `PRs.createPRs`

Enables structured Pull Request generation.

---

### `PRs.model`

Paste your company's Pull Request template here.  
The AI will follow the same format automatically.

---

# 💻 Architecture & Engineering

vibe-git is built using:

- Clean Architecture
- SOLID principles
- Dependency Inversion
- Adapter & Factory patterns

Making it scalable and maintainable.

---

## Design Philosophy

### Spec-Driven Architecture

LLMs are encapsulated through the Strategy Pattern.

Adding support for another provider (like Anthropic Claude) only requires implementing a new adapter.

---

### Fail-Fast Security

The `exec` command contains paranoid safety checkpoints.

Execution is blocked unless:

- The JSON is fully valid
- The target PR base branch is explicitly defined

---

# 🤝 Contributing

```bash
git clone https://github.com/igoralbuquerque12/vibe-git.git

cd vibe-git

npm install

npm link
```

---

# 📄 License

MIT License — free to use, modify, and distribute.

Built with a strong focus on Developer Experience.
