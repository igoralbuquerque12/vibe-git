import logger from "#shared/logger";

export async function createPullRequest({ owner, repo, title, body, head, base }) {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("GITHUB_TOKEN is not set in environment variables.");
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ title, body, head, base }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`GitHub API Error: ${err.message}`);
  }

  const pr = await response.json();
  logger.success(`PR created: ${pr.html_url}`);
  return pr;
}

export async function updatePullRequest({ owner, repo, number, title, body }) {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("GITHUB_TOKEN is not set in environment variables.");
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ title, body }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`GitHub API Error: ${err.message}`);
  }

  const pr = await response.json();
  logger.success(`PR updated: ${pr.html_url}`);
  return pr;
}

export async function getOpenPullRequest({ owner, repo, branchName }) {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls?head=${owner}:${encodeURIComponent(branchName)}&state=open`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const prs = await response.json();
    return prs[0] || null;
  } catch {
    return null;
  }
}
