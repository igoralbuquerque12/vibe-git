import { execSync } from "child_process";

export const gitDiff = () => {
  return execSync("git diff HEAD", {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
  });
};

export const untrackedFiles = () => {
  return execSync("git ls-files --others --exclude-standard", {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
  });
};
