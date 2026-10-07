import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldCreatePullRequest,
  syncPullRequest,
} from "../src/application/use-cases/execute-plan.uc.js";
import { updatePullRequest } from "../src/services/github.js";

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

const prBranch = {
  branchName: "feature/example",
  pr: { title: "feat: new title", body: "new body", base: "main" }
};
const repoInfo = { owner: "acme", repo: "app" };

function createPrDeps({ existingPr = null, confirmed = true } = {}) {
  const calls = { created: [], updated: [], confirmedWith: [] };

  return {
    calls,
    deps: {
      getOpenPR: async () => existingPr,
      createPR: async args => calls.created.push(args),
      updatePR: async args => calls.updated.push(args),
      confirm: async (...args) => {
        calls.confirmedWith.push(args);
        return confirmed;
      }
    }
  };
}

test("creates a new PR when the branch has no open PR", async () => {
  const { calls, deps } = createPrDeps();

  await syncPullRequest(prBranch, { repoInfo, autoCreatePR: true }, deps);

  assert.deepEqual(calls.created, [
    {
      owner: "acme",
      repo: "app",
      title: "feat: new title",
      body: "new body",
      head: "feature/example",
      base: "main"
    }
  ]);
  assert.equal(calls.updated.length, 0);
});

test("updates only title and body when the branch already has an open PR", async () => {
  const existingPr = { number: 7 };
  const { calls, deps } = createPrDeps({ existingPr });

  await syncPullRequest(prBranch, { repoInfo, autoCreatePR: true }, deps);

  assert.deepEqual(calls.updated, [
    {
      owner: "acme",
      repo: "app",
      number: 7,
      title: "feat: new title",
      body: "new body"
    }
  ]);
  assert.equal(calls.created.length, 0);
  assert.equal(calls.confirmedWith[0][3], existingPr);
});

test("does not create or update the PR when confirmation is declined", async () => {
  const { calls, deps } = createPrDeps({ existingPr: { number: 7 }, confirmed: false });

  await syncPullRequest(prBranch, { repoInfo, autoCreatePR: false }, deps);

  assert.equal(calls.created.length, 0);
  assert.equal(calls.updated.length, 0);
});

test("interactive confirmation asks to update when a PR is already open", async () => {
  let asked = "";
  const createInterface = () => ({
    question: async text => {
      asked = text;
      return "y";
    },
    close: () => {}
  });

  assert.equal(
    await shouldCreatePullRequest(prBranch, false, createInterface, { number: 7 }),
    true
  );
  assert.match(asked, /already has an open PR \(#7\)/);
});

test("updatePullRequest sends a PATCH with title and body only", async t => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.GITHUB_TOKEN;
  let request = null;

  process.env.GITHUB_TOKEN = "test-token";
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ html_url: "https://example.test/pr/7" }) };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = originalToken;
    }
  });

  await updatePullRequest({ owner: "acme", repo: "app", number: 7, title: "t", body: "b" });

  assert.equal(request.url, "https://api.github.com/repos/acme/app/pulls/7");
  assert.equal(request.options.method, "PATCH");
  assert.deepEqual(JSON.parse(request.options.body), { title: "t", body: "b" });
});
