import chalk from 'chalk';

const logger = {
  success: (message) => {
    console.log(chalk.green(`✔ ${message}`));
  },

  error: (message) => {
    console.error(chalk.red(`✖ Error: ${message}`));
  },

  warn: (message) => {
    console.warn(chalk.yellow(`⚠ Warning: ${message}`));
  },

  info: (message) => {
    console.log(chalk.cyan(`ℹ ${message}`));
  },

  step: (message) => {
    console.log(chalk.bold.magenta(`\n➔ ${message}`));
  },

  dim: (message) => {
    console.log(chalk.gray(message));
  }
};

export default logger;