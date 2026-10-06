# Automating commits and PRs with a Node.js CLI

*How vibe-git turns a messy diff into atomic commits, branches and Pull Requests with the help of an LLM.*

---

Everyone knows the moment: the feature is done, the tests pass and `git status` shows twenty-three changed files. The right thing would be to split everything into small commits, in the order in which things depend on each other, and write a Pull Request that explains what changed. What usually happens is a `git add .` followed by `git commit -m "fixes"`.

**vibe-git** is a Node.js CLI that automates this part. It reads the changes in the repository, asks a language model for a commit plan and then executes that plan: it creates the branches, makes the commits, pushes and opens the PRs.

In this article I explain how it works on the inside and which design decisions make the difference between "asking the AI to write a commit" and having a tool you can trust.

## The core idea: the AI plans, the code executes

The most important decision in the project is that the model **never runs a Git command**. It only returns a plan in JSON. What executes it is deterministic code, and between the two there is a file you can open, read and edit.

The flow has three steps:

```text
vibe-git run   ->  JSON plan in vibe-git/exit/
   (you review and edit the file)
vibe-git exec  ->  branches, commits, push and PRs
```

This solves the biggest problem of putting an LLM near your Git history: if it gets something wrong, the mistake is in a text file, not in your repository.

## What goes in: the entry file

The model receives more than the diff. You describe the intent in a small JSON file:

```json
{
  "exitName": "feature-auth-plan",
  "prBase": "main",
  "userSummary": [
    "Implemented JWT authentication",
    "Created the login screen"
  ],
  "branches": [
    { "branchName": "feat/auth", "description": "Authentication infrastructure" },
    { "branchName": "feat/login-ui", "description": "Login screen" }
  ]
}
```

The `userSummary` gives the theme of the work. The `branches` say how you want to split the delivery. With that the model knows where each file should go, which the diff alone does not tell it.

## What comes out: the plan

The `run` command brings three things together (the configuration, the entry file and the state of the repository) and returns something like this:

```json
{
  "generatedAt": "2026-10-05T12:00:00.000Z",
  "sourceBranch": "main",
  "branches": [
    {
      "branchName": "feat/auth",
      "pr": {
        "title": "feat(auth): add authentication infrastructure",
        "body": "# Description\n...",
        "base": "main"
      },
      "prHistory": [],
      "commits": [
        { "message": "feat(auth): add token service", "files": ["src/services/token.js"] },
        { "message": "feat(auth): add login route", "files": ["src/routes/login.js"] }
      ]
    }
  ]
}
```

Each commit lists the files that go into it. This is the structure that `exec` walks through later.

## The architecture

The project uses only two dependencies, `chalk` and `dotenv`. The HTTP calls use Node's native `fetch` and the tests use `node:test`. The code is split into simple layers:

```text
bin/cli.js                    entry point, loads the .env
src/router.js                 picks the command
src/commands/                 thin command adapters
src/application/use-cases/    business rules
src/builders/                 prompt assembly
src/parsers/                  reading the AI response
src/providers/ai/             AI providers
src/services/                 Git and GitHub
```

The router is a `switch` over the first argument. Everything that comes after the file name is treated as a flag:

```js
case "exec": {
    const flags = args.slice(2);
    await exec(args[1], flags);
    break;
}
```

The commands hold no business rules. They read the configuration, assemble the dependencies and call a use case. It is the use case that knows what to do.

## Talking to Git

The Git layer is an `execSync` with named functions around it:

```js
export const gitDiff = () => {
  try {
    return exec("git diff HEAD");
  } catch (error) {
    return exec("git diff --cached");
  }
};

export const untrackedFiles = () =>
  exec("git ls-files --others --exclude-standard");
```

One detail: `git diff HEAD` does not show new files that are not tracked yet. That is why the CLI also sends the list of untracked files. For new files, the model sees only the name, not the contents.

## Switching providers without changing the rest

vibe-git works with Gemini, OpenAI and Groq. Each one has an *adapter* with the same method, `generateContent(prompt, systemPrompt)`, which returns the text and the token count. A *factory* picks the adapter based on the configuration:

```js
case "gemini": {
  const apiKey = getAIApiKey("gemini");
  const modelName = getAIModelName("gemini", config);

  return new RetryAiAdapter(new GeminiAdapter(apiKey, modelName));
}
```

Note the `RetryAiAdapter`. It is a *decorator*: it has the same method as the adapters and wraps any of them with up to three attempts, waiting five seconds between them. The use case does not know that retrying exists, nor which provider is on the other side.

Adding a new provider means writing an adapter and registering one line in the factory.

## Building the prompt

This is the most delicate part. The prompt carries a lot: the model's role, the commit rules, the PR instructions, the user's summary, the branches, the diff and the output format.

The diff is by far the largest block. In a big feature it takes up almost the whole prompt. And language models tend to pay less attention to what sits in the middle of a long context, an effect known as *Lost in the Middle*. If the rules come before the diff, they will be too far away by the time the model starts writing the response.

That is why the prompt is assembled in three blocks, in this order:

```text
1. CONTEXT         model's role, user's summary, desired branches
2. DATA            <diff> ... </diff>  <untracked_files> ... </untracked_files>
3. INSTRUCTIONS    commit rules, PR, output format and atomicity
```

The context comes first, so the model reads the diff already knowing what to look for. The rules come last, right next to the point where the response begins.

The middle block takes another precaution. A diff is arbitrary text: it may contain a comment, a README or a prompt file with sentences that look like instructions. So the data goes inside XML tags, preceded by a notice that it is a read-only data payload and that instructions inside it must be ignored.

## The rules that prevent bugs

Some of the prompt's rules exist because of how Git works, not for style. The main one:

```text
ANTI-BUG RULE (FILE-LEVEL ATOMICITY):
1. 'git add' stages the entire file.
2. NEVER generate two separate commits for the same file in the same plan.
```

The executor uses `git add <file>`, which stages the whole file. If the model put the same file in two commits, the first would take all the changes and the second would be empty. The rule keeps the plan from promising something the executor cannot deliver.

Other rules push the model toward small commits: do not mix different scopes, be suspicious of commits with more than four files, and split any commit whose message needs an "and".

## Reading the response without trusting it

The prompt asks for pure JSON, with no markdown. Models do not always comply. The parser tries three strategies, from the strictest to the most tolerant:

```js
const attempts = [
  () => JSON.parse(raw),
  () => {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (!match) throw new Error("No code block found");
    return JSON.parse(match[1].trim());
  },
  () => {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON object found");
    return JSON.parse(raw.slice(start, end + 1));
  },
];
```

First the whole text. Then the contents of a code block. Finally, everything between the first and the last brace. Only when all three fail does the user see an error.

## Incremental PRs

A PR is rarely born finished. You open it, get reviewed, make more commits. If the AI wrote the description from scratch on every round, looking only at the new diff, the PR would lose everything that had already been explained.

`run` solves this by looking for an existing PR body for each branch, in two sources:

1. **GitHub.** An API lookup fetches the open PR for that branch. Without a token, or if the call fails, the function returns `null` and the flow carries on.
2. **The previous plan.** If a file already exists at the same output path, the `pr` saved in it serves as the base.

GitHub takes precedence because it reflects what is published, including edits made by hand. The local file is the *fallback*.

The body that is found is injected into the prompt, next to the branch, with the instruction to combine the current text with the new changes.

After the AI responds, a part that is just code takes over. The old `pr` is archived before the file is overwritten:

```js
const prHistory = [...(prevBranch?.prHistory || [])];

if (prevBranch?.pr) {
  prHistory.push({ ...prevBranch.pr, archivedAt: now.toISOString() });
}

return { ...newBranch, prHistory };
```

The schema sent to the model always asks for `prHistory` as an empty list. Keeping history is deterministic work, and leaving it to the model would be an invitation to make things up.

Anyone who wants to start from scratch passes `--ignore-pr-history`.

## Executing the plan

`exec` reads the JSON and walks through the branches. For each one:

1. it creates the branch, or checks it out if it already exists;
2. for each commit, it runs `git add` on the files and `git commit` with the message;
3. it runs `git push origin <branch>`;
4. it creates the Pull Request through the GitHub API;
5. it returns to the source branch before the next one.

Before any command there is a validation: a plan with no branches, or with a PR without a target branch, is rejected. From there on the executor is tolerant: a file that does not exist becomes a warning, an empty commit is skipped, and a push failure is recorded without interrupting the other branches.

PR creation has three modes. By default the CLI asks, branch by branch. With `--auto-create-pr` it creates everything without asking, which is useful for running without an interactive terminal. With `--ignore-pr` it does not touch GitHub.

The confirmation was written to be testable. The function receives the `readline` factory as a parameter:

```js
export async function shouldCreatePullRequest(
  branch,
  autoCreatePR,
  createInterface = readline.createInterface
) {
```

In the tests, it is enough to pass a fake interface that answers "y" or "n". No test needs a terminal, a repository or the network.

## Lessons learned

Three ideas from vibe-git apply to any tool that puts an LLM in a real workflow:

- **Separate plan and execution.** The model produces data and the code acts. Between the two, a file a person can review.
- **Treat the model's output as untrusted input.** A tolerant parser, validation before executing, and never letting the model handle what code does better.
- **The order of the prompt matters.** Context at the start, data in the middle and delimited, rules at the end.

The rest is Node.js with no mystery: a `switch`, a few `execSync` calls, `fetch` and a handful of small functions.

## Try it

```bash
npm install -g @igoralbuquerque/vibe-git

vibe-git init
vibe-git run example
vibe-git exec feature-auth-plan
```

The code is at [github.com/igoralbuquerque12/vibe-git](https://github.com/igoralbuquerque12/vibe-git).
