#!/usr/bin/env node
import "dotenv/config";
import { init, run } from "../src/commands/index.js";
import logger from "../src/utils/logger.js";

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "init":
    await init();
    break;
  case "run":
    const subCommand = args[1];
    await run(subCommand);
    break;
  default:
    logger.warn("Use: vibe-git init | run [template-file]");
}
