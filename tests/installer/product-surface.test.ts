import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_CODEX_MEM_DATA_DIR,
  INSTALLER_IDE_OPTIONS,
  buildNextStepsLines,
  getIDELabels,
} from '../../installer/src/utils/product-surface.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), 'utf-8');
}

describe('installer product surface', () => {
  it('uses the Codex-mem data directory by default', () => {
    expect(DEFAULT_CODEX_MEM_DATA_DIR).toBe('~/.Codex-mem');
  });

  it('offers Codex as a first-class installer target', () => {
    expect(INSTALLER_IDE_OPTIONS.map((option) => option.value)).toContain('codex');
  });

  it('renders Codex in installer IDE labels', () => {
    expect(getIDELabels(['codex', 'cursor'])).toBe('Codex, Cursor');
  });

  it('builds Codex-first next steps when Codex is selected', () => {
    const lines = buildNextStepsLines(
      { workerPort: '37777' },
      ['codex']
    );

    expect(lines.some((line) => line.includes('Open Codex'))).toBe(true);
    expect(lines.some((line) => line.includes('codex-mem codex init'))).toBe(true);
    expect(lines.some((line) => line.includes('http://localhost:37777'))).toBe(true);
  });

  it('uses codex-first installer prompts and settings paths', () => {
    const welcome = readProjectFile('installer/src/steps/welcome.ts');
    const provider = readProjectFile('installer/src/steps/provider.ts');
    const install = readProjectFile('installer/src/steps/install.ts');

    expect(welcome).toContain("codex-mem installer");
    expect(welcome).toContain("~/.Codex-mem/settings.json");
    expect(welcome).toContain("Existing codex-mem installation detected.");

    expect(provider).toContain("Which AI provider should codex-mem use for memory compression?");
    expect(install).toContain("Run: codex-mem cursor setup");
  });

  it('keeps the published installer bootstrap assets aligned with Codex defaults', () => {
    const publicInstallScript = readProjectFile('install/public/install.sh');
    const publicInstallerBundle = readProjectFile('install/public/installer.js');

    expect(publicInstallScript).toContain('codex-mem installer');
    expect(publicInstallScript).toContain('codex-mem-installer');

    expect(publicInstallerBundle).toContain('~/.Codex-mem');
    expect(publicInstallerBundle).toContain('Existing codex-mem installation detected.');
    expect(publicInstallerBundle).toContain('Which AI provider should codex-mem use for memory compression?');
    expect(publicInstallerBundle).toContain('Run: codex-mem cursor setup');
    expect(publicInstallerBundle).toContain('codex-mem installed successfully!');
    expect(publicInstallerBundle).not.toContain('~/.claude-mem');
  });
});
