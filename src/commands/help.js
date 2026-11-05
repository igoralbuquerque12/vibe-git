import { readFileSync } from "node:fs";

const COMMAND_HELP = {
  init: {
    usage: "vibe-git init",
    description:
      "Creates the config, .env and the vibe-git/entry and vibe-git/exit workspace.",
    flags: [],
  },
  run: {
    usage: "vibe-git run <entry-file> [--ignore-pr-history]",
    description: "Generates an editable JSON execution plan in vibe-git/exit/.",
    flags: [
      [
        "--ignore-pr-history",
        "Generate the plan from scratch, ignoring existing Pull Request context.",
      ],
    ],
  },
  plan: {
    usage: "vibe-git plan <entry-file>",
    description:
      "Generates a Markdown analysis and Git script in vibe-git/exit/. Does not run Git commands.",
    flags: [],
  },
  exec: {
    usage: "vibe-git exec <exit-file> [--ignore-pr] [--auto] [--draft]",
    description:
      "Executes a JSON plan: creates branches, commits, pushes and Pull Requests.",
    flags: [
      ["--ignore-pr", "Skip all Pull Request validation and creation."],
      [
        "--auto",
        "Create (or update) every PR in the plan without asking for confirmation.",
      ],
      [
        "--draft",
        "Open newly created Pull Requests as drafts. Existing PRs keep their state.",
      ],
    ],
  },
};

const GLOBAL_FLAGS = [
  ["-h, --help", "Show help. Combine with a command for its details."],
  ["-v, --version", "Show the installed version."],
];

function formatRows(rows) {
  const width = Math.max(...rows.map(([name]) => name.length));
  return rows.map(([name, text]) => `  ${name.padEnd(width)}  ${text}`).join("\n");
}

export function isCommand(name) {
  return Object.hasOwn(COMMAND_HELP, name);
}

export function getVersion() {
  const packageUrl = new URL("../../package.json", import.meta.url);
  return JSON.parse(readFileSync(packageUrl, "utf8")).version;
}

export function getHelpText(command) {
  if (isCommand(command)) {
    const { usage, description, flags } = COMMAND_HELP[command];
    const sections = [`Usage: ${usage}`, description];

    if (flags.length > 0) {
      sections.push(`Flags:\n${formatRows(flags)}`);
    }

    return sections.join("\n\n");
  }

  const commands = Object.values(COMMAND_HELP).map(({ usage }) => `  ${usage}`);

  return [
    "vibe-git - plan and run Git commits and Pull Requests with AI.",
    "Usage: vibe-git <command> [options]",
    `Commands:\n${commands.join("\n")}`,
    `Options:\n${formatRows(GLOBAL_FLAGS)}`,
    "Run 'vibe-git <command> --help' for details about a command.",
  ].join("\n\n");
}

export function help(command) {
  console.log(getHelpText(command));
}

export function version() {
  console.log(getVersion());
}
