#!/usr/bin/env node
import "dotenv/config";
import { bootstrap } from "../src/router.js";

const args = process.argv.slice(2);
bootstrap(args).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});