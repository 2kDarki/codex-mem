import { existsSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { homedir } from 'os';

export interface CodexMemCliDeps {
  runTranscriptCommand: (subcommand: string | undefined, args: string[]) => Promise<number>;
  runWorkerCommand: (args: string[]) => Promise<number>;
  writeLine: (line: string) => void;
  writeError: (line: string) => void;
}

function getHelpText(): string {
  return [
    'Usage: codex-mem <command> [args]',
    '',
    'Commands:',
    '  codex <init|watch|validate>   Manage Codex transcript ingestion',
    '  transcript <init|watch|validate>  Alias for codex',
    '  worker <start|stop|restart|status> Manage the worker service',
    '  cursor <install|uninstall|status|setup> Manage Cursor integration',
  ].join('\n');
}

function getBunExecutableCandidates(): string[] {
  const candidates = [
    path.join(
      homedir(),
      'AppData',
      'Local',
      'Microsoft',
      'WinGet',
      'Packages',
      'Oven-sh.Bun.Baseline_Microsoft.Winget.Source_8wekyb3d8bbwe',
      'bun-windows-x64-baseline',
      'bun.exe'
    ),
    path.join(
      homedir(),
      'AppData',
      'Local',
      'Microsoft',
      'WinGet',
      'Packages',
      'Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe',
      'bun-windows-x64',
      'bun.exe'
    ),
    path.join(homedir(), '.bun', 'bin', process.platform === 'win32' ? 'bun.exe' : 'bun'),
    'bun',
  ];

  return candidates;
}

function resolveBunExecutable(): string {
  for (const candidate of getBunExecutableCandidates()) {
    if (candidate === 'bun' || existsSync(candidate)) {
      return candidate;
    }
  }
  return 'bun';
}

async function defaultRunWorkerCommand(args: string[]): Promise<number> {
  const workerScriptPath = path.resolve(process.cwd(), 'plugin', 'scripts', 'worker-service.cjs');
  const bunExecutable = resolveBunExecutable();

  return await new Promise<number>((resolve) => {
    const child = spawn(bunExecutable, [workerScriptPath, ...args], {
      stdio: 'inherit',
      shell: false,
    });

    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

async function defaultRunTranscriptCommand(
  subcommand: string | undefined,
  args: string[],
): Promise<number> {
  const { runTranscriptCommand } = await import('../services/transcripts/cli.js');
  return await runTranscriptCommand(subcommand, args);
}

export async function runCodexMemCli(
  argv: string[],
  deps: Partial<CodexMemCliDeps> = {},
): Promise<number> {
  const command = argv[0];
  const args = argv.slice(1);
  const helpers: CodexMemCliDeps = {
    runTranscriptCommand: deps.runTranscriptCommand ?? defaultRunTranscriptCommand,
    runWorkerCommand: deps.runWorkerCommand ?? defaultRunWorkerCommand,
    writeLine: deps.writeLine ?? ((line: string) => console.log(line)),
    writeError: deps.writeError ?? ((line: string) => console.error(line)),
  };

  switch (command) {
    case 'codex':
    case 'transcript':
      return await helpers.runTranscriptCommand(args[0], args.slice(1));
    case 'worker':
      return await helpers.runWorkerCommand(args);
    case 'cursor':
      return await helpers.runWorkerCommand([command, ...args]);
    default:
      helpers.writeError(getHelpText());
      return 1;
  }
}
