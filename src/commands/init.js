import {
  DEFAULT_CONFIG,
  DEFAULT_ENTRY_TEMPLATE,
} from "#constants/default-constants";

import {
  addToFile,
  ensureDir,
  saveJson,
} from "#utils/filesystem";

import logger from "#utils/logger";

export async function init() {
  try {
    await saveJson("gen-commit.config.json", DEFAULT_CONFIG);

    await ensureDir("gen-commit/entry");
    await ensureDir("gen-commit/exit");

    await saveJson(
      "gen-commit/entry/example.json",
      DEFAULT_ENTRY_TEMPLATE
    );

    await addToFile(".gitignore", ["gen-commit/"]);
    await addToFile(".env", ["GEN_COMMIT_AI_API_KEY="]);

    logger.success(`gen-commit initialized successfully!

        Created files:
        - gen-commit.config.json
        - gen-commit/entry/example.md
        - gen-commit/exit/example.md

        Next steps:
        1. Edit the templates in gen-commit/entry and gen-commit/exit
        2. Adjust the settings in gen-commit.config.json
        3. Start using gen-commit 🚀
    `);
  } catch (error) {
    logger.error(`Failed to initialize gen-commit \n ${error.message}`);
  }
}
