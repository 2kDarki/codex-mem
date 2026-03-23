import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), 'utf-8');
}

describe('Codex package surface', () => {
  it('publishes the package as codex-mem with a real CLI bin', () => {
    const packageJson = JSON.parse(readProjectFile('package.json'));

    expect(packageJson.name).toBe('codex-mem');
    expect(packageJson.description).toContain('Codex');
    expect(packageJson.bin).toEqual({
      'codex-mem': './plugin/scripts/codex-mem.cjs',
    });
    expect(packageJson.files).toContain('plugin');
  });

  it('uses Codex-first package scripts for sync and worker logs', () => {
    const packageJson = JSON.parse(readProjectFile('package.json'));

    expect(packageJson.scripts['build-and-sync']).toContain('~/.Codex/plugins/marketplaces/thedotmack');
    expect(packageJson.scripts['worker:logs']).toContain('~/.Codex-mem/logs/');
    expect(packageJson.scripts['worker:tail']).toContain('~/.Codex-mem/logs/');
  });
});

describe('Codex build and sync tooling', () => {
  it('builds and verifies a codex-mem CLI artifact', () => {
    const buildScript = readProjectFile('scripts/build-hooks.js');

    expect(buildScript).toContain("name: 'codex-mem-plugin'");
    expect(buildScript).toContain("description: 'Runtime dependencies for codex-mem bundled hooks'");
    expect(buildScript).toContain("name: 'codex-mem'");
    expect(buildScript).toContain("source: 'src/bin/codex-mem-cli.ts'");
    expect(buildScript).toContain('codex-mem.cjs');
  });

  it('syncs marketplace builds into Codex plugin directories', () => {
    const syncScript = readProjectFile('scripts/sync-marketplace.cjs');

    expect(syncScript).toContain(".Codex', 'plugins', 'marketplaces', 'thedotmack'");
    expect(syncScript).toContain(".Codex', 'plugins', 'cache', 'thedotmack', 'codex-mem'");
    expect(syncScript).not.toContain(".claude', 'plugins', 'marketplaces', 'thedotmack'");
  });

  it('ships the source CLI entrypoint referenced by the build', () => {
    expect(existsSync(path.join(projectRoot, 'src/bin/codex-mem.ts'))).toBe(true);
  });
});
