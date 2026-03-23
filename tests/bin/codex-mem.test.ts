import { describe, expect, it } from 'bun:test';
import { runCodexMemCli } from '../../src/bin/codex-mem.js';

describe('codex-mem CLI', () => {
  it('routes codex commands to transcript runner', async () => {
    const transcriptCalls: Array<{ subcommand: string | undefined; args: string[] }> = [];

    const exitCode = await runCodexMemCli(['codex', 'watch', '--config', 'custom.json'], {
      runTranscriptCommand: async (subcommand, args) => {
        transcriptCalls.push({ subcommand, args });
        return 23;
      },
      runWorkerCommand: async () => 99,
      writeLine: () => undefined,
      writeError: () => undefined,
    });

    expect(exitCode).toBe(23);
    expect(transcriptCalls).toEqual([
      { subcommand: 'watch', args: ['--config', 'custom.json'] }
    ]);
  });

  it('routes worker commands to the worker runner', async () => {
    const workerCalls: string[][] = [];

    const exitCode = await runCodexMemCli(['worker', 'status'], {
      runTranscriptCommand: async () => 99,
      runWorkerCommand: async (args) => {
        workerCalls.push(args);
        return 7;
      },
      writeLine: () => undefined,
      writeError: () => undefined,
    });

    expect(exitCode).toBe(7);
    expect(workerCalls).toEqual([['status']]);
  });

  it('prints help and exits non-zero for unknown commands', async () => {
    const lines: string[] = [];

    const exitCode = await runCodexMemCli(['mystery'], {
      runTranscriptCommand: async () => 0,
      runWorkerCommand: async () => 0,
      writeLine: (line) => lines.push(line),
      writeError: (line) => lines.push(line),
    });

    expect(exitCode).toBe(1);
    expect(lines.join('\n')).toContain('Usage: codex-mem');
  });
});
