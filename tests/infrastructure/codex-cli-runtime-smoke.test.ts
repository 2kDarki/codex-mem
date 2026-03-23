import { describe, expect, it } from 'bun:test';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const bundledCliPath = path.join(projectRoot, 'plugin', 'scripts', 'codex-mem.cjs');

describe('bundled codex-mem CLI runtime', () => {
  it('prints the Codex-first compatibility matrix in bundled help output', () => {
    const result = spawnSync(process.execPath, [bundledCliPath, 'mystery'], {
      cwd: projectRoot,
      encoding: 'utf-8',
    });

    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).toBe(1);
    expect(output).toContain('Usage: codex-mem');
    expect(output).toContain('Codex is the primary runtime. Cursor is a supported compatibility host.');
    expect(output).toContain('codex <init|watch|validate>');
    expect(output).toContain('cursor <install|uninstall|status|setup>');
  });
});
