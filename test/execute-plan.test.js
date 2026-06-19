import assert from "node:assert/strict";
import test from "node:test";

import { shouldCreatePullRequest } from "../src/application/use-cases/execute-plan.uc.js";

const branch = {
  branchName: "feature/example",
  pr: { base: "main" }
};

test("--auto-create-pr creates the PR without opening readline", async () => {
  const createInterface = () => {
    throw new Error("readline should not be opened");
  };

  assert.equal(await shouldCreatePullRequest(branch, true, createInterface), true);
});

test("interactive confirmation creates the PR only for y", async () => {
  let closed = false;
  const createInterface = () => ({
    question: async () => " Y ",
    close: () => {
      closed = true;
    }
  });

  assert.equal(await shouldCreatePullRequest(branch, false, createInterface), true);
  assert.equal(closed, true);
});

test("interactive confirmation skips the PR for any response other than y", async () => {
  const createInterface = () => ({
    question: async () => "n",
    close: () => {}
  });

  assert.equal(await shouldCreatePullRequest(branch, false, createInterface), false);
});

test("interactive confirmation closes readline when prompting fails", async () => {
  let closed = false;
  const createInterface = () => ({
    question: async () => {
      throw new Error("stdin failed");
    },
    close: () => {
      closed = true;
    }
  });

  await assert.rejects(
    shouldCreatePullRequest(branch, false, createInterface),
    /stdin failed/
  );
  assert.equal(closed, true);
});
