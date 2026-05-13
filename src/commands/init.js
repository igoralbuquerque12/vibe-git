import {
  DEFAULT_CONFIG,
  DEFAULT_ENTRY_TEMPLATE,
} from "#constants/default-constants";

import { addToFile, ensureDir, saveJson } from "#shared/filesystem";

import logger from "#shared/logger";

export async function init() {
  try {
    await saveJson("vibe-git.config.json", DEFAULT_CONFIG);

    await ensureDir("vibe-git/entry");
    await ensureDir("vibe-git/exit");

    await saveJson("vibe-git/entry/example.json", DEFAULT_ENTRY_TEMPLATE);

    await addToFile(".gitignore", ["vibe-git/"]);
    await addToFile(".env", [
      "VIBE_GIT_AI_API_KEY=",
      "GITHUB_TOKEN=",
    ]);

    logger.success(`vibe-git initialized successfully!

        Created files:
        - vibe-git.config.json
        - vibe-git/entry/example.md
        - vibe-git/exit/example.md

        Next steps:
        1. Edit the templates in vibe-git/entry
        2. Adjust the settings in vibe-git.config.json
        3. Put your AI API key in the .env file (VIBE_GIT_AI_API_KEY)
        4. Start using vibe-git 🚀
    `);
  } catch (error) {
    logger.error(`Failed to initialize vibe-git \n ${error.message}`);
  }
}
