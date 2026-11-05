import { exec, help, init, isCommand, plan, run, version } from "./commands/index.js";
import logger from "./shared/logger.js";

const HELP_FLAGS = ["-h", "--help"];

// "exec --help" is routed as "help exec".
function redirectHelpFlag(args) {
    const [command, ...rest] = args;
    const asksForHelp = isCommand(command) && rest.some(arg => HELP_FLAGS.includes(arg));

    return asksForHelp ? ["help", command] : args;
}

export async function bootstrap(args) {
    const [command, ...rest] = redirectHelpFlag(args);

    switch (command) {
        case undefined:
        case "-h":
        case "--help":
            help();
            break;
        case "help":
            help(rest[0]);
            break;
        case "-v":
        case "--version":
            version();
            break;
        case "init":
            await init();
            break;
        case "run":
            await run(rest[0], rest.slice(1));
            break;
        case "plan":
            await plan(rest[0]);
            break;
        case "exec":
            await exec(rest[0], rest.slice(1));
            break;
        default:
            logger.error(`Unknown command: ${command}`);
            help();
            process.exitCode = 1;
    }
}
