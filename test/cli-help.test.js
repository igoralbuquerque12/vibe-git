import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getHelpText, getVersion } from "../src/commands/help.js";
import { bootstrap } from "../src/router.js";

const packageVersion = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
).version;

async function runCli(t, args) {
  const output = [];
  const originalExitCode = process.exitCode;

  t.mock.method(console, "log", (...parts) => output.push(parts.join(" ")));
  t.mock.method(console, "error", (...parts) => output.push(parts.join(" ")));
  t.after(() => {
    process.exitCode = originalExitCode;
  });

  await bootstrap(args);

  return { text: output.join("\n"), exitCode: process.exitCode };
}

test("getVersion returns the version from package.json", () => {
  assert.equal(getVersion(), packageVersion);
});

test("--version and -v print only the package version", async t => {
  for (const flag of ["--version", "-v"]) {
    const { text, exitCode } = await runCli(t, [flag]);

    assert.equal(text, packageVersion);
    assert.notEqual(exitCode, 1);
  }
});

test("--help, -h, help and no arguments print the general help", async t => {
  for (const args of [["--help"], ["-h"], ["help"], []]) {
    const { text, exitCode } = await runCli(t, args);

    assert.equal(text, getHelpText());
    assert.notEqual(exitCode, 1);
  }
});

test("general help lists every command and the global flags", () => {
  const text = getHelpText();

  for (const command of ["init", "run", "plan", "exec"]) {
    assert.match(text, new RegExp(`vibe-git ${command}`));
  }
  assert.match(text, /--help/);
  assert.match(text, /--version/);
  assert.match(text, /--draft/);
});

test("<command> --help prints the help for that command without running it", async t => {
  const { text } = await runCli(t, ["exec", "--help"]);

  assert.equal(text, getHelpText("exec"));
  assert.match(text, /--ignore-pr/);
  assert.match(text, /--auto/);
  assert.match(text, /--draft/);
});

test("help <command> prints the help for that command", async t => {
  const { text } = await runCli(t, ["help", "run"]);

  assert.equal(text, getHelpText("run"));
  assert.match(text, /--ignore-pr-history/);
});

test("an unknown command reports the error, shows the help and exits with code 1", async t => {
  const { text, exitCode } = await runCli(t, ["nope"]);

  assert.match(text, /Unknown command: nope/);
  assert.match(text, /Usage: vibe-git <command>/);
  assert.equal(exitCode, 1);
});
