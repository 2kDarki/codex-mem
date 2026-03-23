import { describe, expect, it } from 'bun:test';
import {
  DEFAULT_CODEX_MEM_DATA_DIR,
  INSTALLER_IDE_OPTIONS,
  buildNextStepsLines,
  getIDELabels,
} from '../../installer/src/utils/product-surface.js';

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
});
