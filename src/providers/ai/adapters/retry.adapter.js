import { setTimeout as wait } from "node:timers/promises";

import logger from "#shared/logger";

export class RetryAiAdapter {
  constructor(aiProvider, { maxAttempts = 3, retryDelayMs = 5000, waitFn = wait } = {}) {
    this.aiProvider = aiProvider;
    this.maxAttempts = maxAttempts;
    this.retryDelayMs = retryDelayMs;
    this.waitFn = waitFn;
  }

  async generateContent(...args) {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await this.aiProvider.generateContent(...args);
      } catch (error) {
        const retryMessage = attempt < this.maxAttempts
          ? `; retrying in ${this.retryDelayMs / 1000} seconds`
          : "";

        logger.error(
          `LLM request failed (attempt ${attempt}/${this.maxAttempts}): ${error.message}${retryMessage}`
        );

        if (attempt === this.maxAttempts) {
          throw error;
        }

        await this.waitFn(this.retryDelayMs);
      }
    }
  }
}
