import { execSync } from "child_process";

const exec = command => {
  return execSync(command, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
  });
};

export const gitDiff = () => {
  try {
    return exec("git diff HEAD");
  } catch (error) {
    return exec("git diff --cached");
  }
};

export const untrackedFiles = () =>
  exec("git ls-files --others --exclude-standard");

export const getCurrentBranch = () =>
  exec("git branch --show-current").trim();

export const getRepoInfo = () => {
  const remoteUrl = exec("git remote get-url origin").trim();

  const httpsMatch = remoteUrl.match(
    /https:\/\/github\.com\/([^/]+)\/([^/.]+)/
  );
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };

  const sshMatch = remoteUrl.match(/git@github\.com:([^/]+)\/([^/.]+)/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };

  throw new Error(
    "Could not parse GitHub owner/repo from remote URL. Only GitHub is supported."
  );
};

export const checkoutNewBranch = branchName =>
  exec(`git checkout -b "${branchName}"`);

export const checkoutBranch = branchName =>
  exec(`git checkout "${branchName}"`);

export const gitAdd = filePath => exec(`git add "${filePath}"`);

export const gitCommit = message =>
  exec(`git commit -m "${message.replace(/"/g, '\\"')}"`);

export const gitPush = branchName => exec(`git push origin "${branchName}"`);

export const gitStatus = () => exec("git status --short");