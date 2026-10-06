import { exec, init, plan, run } from "./commands/index.js";
import logger from "./shared/logger.js";

export async function bootstrap(args) {
    const command = args[0];

    switch (command) {
        case "init":
            await init();
            break;
        case "run": {
            const flags = args.slice(2);
            await run(args[1], flags);
            break;
        }
        case "plan":
            await plan(args[1]);
            break;
        case "exec": {
            const flags = args.slice(2);
            await exec(args[1], flags);
            break;
        }
        default:
            logger.warn(
                "Use: vibe-git init | run [file] [--ignore-pr-history] | plan [file] | exec [file] [--ignore-pr] [--auto-create-pr]"
            );
    }
}
