import assert from "node:assert/strict";
import test from "node:test";

import { mergePrHistory } from "../src/application/use-cases/generate-plan-json.uc.js";
import { buildRunPrompt } from "../src/builders/prompt.js";
import { jsonOutputInstructions } from "../src/constants/fixed-prompt.js";
import { getOpenPullRequest } from "../src/services/github.js";

const config = { commits: {}, PRs: { createPRs: true } };
const template = {
  branches: [
    { branchName: "feature/a", description: "Feature A" },
    { branchName: "feature/b", description: "Feature B" },
  ],
};

function buildPrompt(extra = {}) {
  return buildRunPrompt({
    config,
    template,
    diff: "DIFF_CONTENT",
    untracked: "UNTRACKED_CONTENT",
    ...extra,
  });
}

async function withGithubMock({ token, fetchImpl }, callback) {
  const originalToken = process.env.GITHUB_TOKEN;
  const originalFetch = globalThis.fetch;

  if (token) {
    process.env.GITHUB_TOKEN = token;
  } else {
    delete process.env.GITHUB_TOKEN;
  }
  globalThis.fetch = fetchImpl;

  try {
    return await callback();
  } finally {
    if (originalToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = originalToken;
    }
    globalThis.fetch = originalFetch;
  }
}

test("run prompt places data payload between context and critical instructions", () => {
  const prompt = buildPrompt();

  const branchIndex = prompt.indexOf("DESIRED BRANCH STRUCTURE:");
  const payloadIndex = prompt.indexOf("DATA PAYLOAD (READ ONLY)");
  const diffIndex = prompt.indexOf("<diff>\nDIFF_CONTENT\n</diff>");
  const untrackedIndex = prompt.indexOf(
    "<untracked_files>\nUNTRACKED_CONTENT\n</untracked_files>"
  );
  const criticalIndex = prompt.indexOf("CRITICAL INSTRUCTIONS:");

  assert.ok(branchIndex !== -1 && diffIndex !== -1 && untrackedIndex !== -1);
  assert.ok(branchIndex < payloadIndex);
  assert.ok(payloadIndex < diffIndex);
  assert.ok(diffIndex < untrackedIndex);
  assert.ok(untrackedIndex < criticalIndex);

  for (const rule of [
    "COMMIT CONVENTIONS:",
    "PR INSTRUCTIONS:",
    "OUTPUT FORMAT - CRITICAL:",
    "CRITICAL TECHNICAL RULES",
    "ANTI-BUG RULE",
  ]) {
    assert.ok(prompt.indexOf(rule) > criticalIndex, `${rule} must come last`);
  }
});

test("run prompt has no incremental context without history", () => {
  assert.doesNotMatch(buildPrompt(), /INCREMENTAL PR CONTEXT/);
});

test("run prompt prefers the GitHub PR body over the previous plan", () => {
  const prompt = buildPrompt({
    githubPrs: { "feature/a": { body: "REMOTE_BODY" } },
    previousPlan: {
      branches: [
        { branchName: "feature/a", pr: { body: "LOCAL_BODY_A" } },
        { branchName: "feature/b", pr: { body: "LOCAL_BODY_B" } },
      ],
    },
  });

  assert.match(prompt, /REMOTE_BODY/);
  assert.doesNotMatch(prompt, /LOCAL_BODY_A/);
  assert.match(prompt, /LOCAL_BODY_B/);
  assert.equal(prompt.match(/\[INCREMENTAL PR CONTEXT\]/g).length, 2);
});

test("json schema instructs the AI to return an empty prHistory", () => {
  assert.match(jsonOutputInstructions, /"prHistory": \[\]/);
  assert.match(jsonOutputInstructions, /MUST return an empty array \[\]/);
});

test("mergePrHistory archives the previous PR and keeps older history", () => {
  const now = new Date("2026-01-02T03:04:05.000Z");
  const previousPlan = {
    branches: [
      {
        branchName: "feature/a",
        pr: { title: "old", body: "old body", base: "main" },
        prHistory: [{ title: "older", archivedAt: "2025-01-01T00:00:00.000Z" }],
      },
    ],
  };
  const branches = [
    { branchName: "feature/a", pr: { title: "new" }, prHistory: [], commits: [] },
    { branchName: "feature/b", pr: { title: "b" }, commits: [] },
  ];

  const merged = mergePrHistory(branches, previousPlan, now);

  assert.deepEqual(merged[0].prHistory, [
    { title: "older", archivedAt: "2025-01-01T00:00:00.000Z" },
    {
      title: "old",
      body: "old body",
      base: "main",
      archivedAt: "2026-01-02T03:04:05.000Z",
    },
  ]);
  assert.equal(merged[0].pr.title, "new");
  assert.deepEqual(merged[1].prHistory, []);
  assert.equal(previousPlan.branches[0].prHistory.length, 1);
});

test("mergePrHistory returns empty history without a previous plan", () => {
  const merged = mergePrHistory([{ branchName: "feature/a", commits: [] }], null);

  assert.deepEqual(merged, [
    { branchName: "feature/a", commits: [], prHistory: [] },
  ]);
});

test("getOpenPullRequest returns null without GITHUB_TOKEN", async () => {
  const fetchImpl = () => {
    throw new Error("fetch should not be called");
  };

  const result = await withGithubMock({ token: null, fetchImpl }, () =>
    getOpenPullRequest({ owner: "o", repo: "r", branchName: "feature/a" })
  );

  assert.equal(result, null);
});

test("getOpenPullRequest returns the first open PR", async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => [{ body: "first" }, { body: "second" }] };
  };

  const result = await withGithubMock({ token: "token", fetchImpl }, () =>
    getOpenPullRequest({ owner: "o", repo: "r", branchName: "feature/a" })
  );

  assert.deepEqual(result, { body: "first" });
  assert.equal(
    request.url,
    "https://api.github.com/repos/o/r/pulls?head=o:feature%2Fa&state=open"
  );
  assert.equal(request.options.method, "GET");
  assert.equal(request.options.headers.Authorization, "Bearer token");
});

test("getOpenPullRequest returns null for empty, failed or throwing responses", async () => {
  const params = { owner: "o", repo: "r", branchName: "feature/a" };
  const fetchImpls = [
    async () => ({ ok: true, json: async () => [] }),
    async () => ({ ok: false, json: async () => ({ message: "nope" }) }),
    async () => {
      throw new Error("network down");
    },
  ];

  for (const fetchImpl of fetchImpls) {
    const result = await withGithubMock({ token: "token", fetchImpl }, () =>
      getOpenPullRequest(params)
    );

    assert.equal(result, null);
  }
});
