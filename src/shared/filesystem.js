import fs from "fs/promises";
import path from "path";

/**
 * Returns the directory where the user is executing the command.
 */
export const getUserDir = () => process.cwd();

/**
 * Constructs the full path for a file in the user's directory.
 * @param {string} fileName
 */
export const getFullPath = fileName => path.join(getUserDir(), fileName);

/**
 * Constructs the path for the config file.
 */
export const getConfigPath = (fileName = "vibe-git.config.json") => {
  return getFullPath(fileName);
};

/**
 * Checks if a file or directory exists.
 * @param {string} filePath
 */
export const exists = async filePath => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Reads and parses a JSON file.
 */
export const readJson = async filePath => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
};

/**
 * Stringifies and saves data to a JSON file.
 */
export const saveJson = async (filePath, data) => {
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, content, "utf-8");
};

/**
 * Ensures a directory exists (creates it recursively if it doesn't).
 * @param {string} relativePath - e.g., 'vibe-git/exit'
 */
export const ensureDir = async relativePath => {
  const dirPath = getFullPath(relativePath);

  if (!(await exists(dirPath))) {
    await fs.mkdir(dirPath, { recursive: true });
  }

  return dirPath;
};

/**
 * Saves content to a Markdown file within a specific directory.
 */
export const saveMarkdown = async (relativePath, fileName, content) => {
  const targetDir = await ensureDir(relativePath);
  const filePath = path.join(targetDir, fileName);

  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
};

/**
 * Appends unique entries to a file (useful for .gitignore or .env).
 * @param {string} fileName
 * @param {string[]} entries
 */
export const addToFile = async (fileName, entries) => {
  const filePath = getFullPath(fileName);
  let content = "";

  if (await exists(filePath)) {
    content = await fs.readFile(filePath, "utf-8");
  }

  const lines = content.split("\n").map(line => line.trim());
  const newEntries = entries.filter(entry => !lines.includes(entry));

  if (newEntries.length === 0) return [];

  const prefix = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
  const addition = newEntries.join("\n") + "\n";

  await fs.appendFile(filePath, prefix + addition, "utf-8");

  return newEntries;
};
