import { runCodexMemCli } from './codex-mem.js';

void (async () => {
  try {
    const exitCode = await runCodexMemCli(process.argv.slice(2));
    process.exit(exitCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
})();
