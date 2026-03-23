import type { IDE } from '../steps/ide-selection.js';

export const DEFAULT_CODEX_MEM_DATA_DIR = '~/.Codex-mem';

export interface InstallerIdeOption {
  value: IDE;
  label: string;
  hint?: string;
}

export const INSTALLER_IDE_OPTIONS: InstallerIdeOption[] = [
  { value: 'codex', label: 'Codex', hint: 'recommended' },
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'cursor', label: 'Cursor' },
];

export function getIDELabels(ides: IDE[]): string {
  return ides.map((ide) => {
    switch (ide) {
      case 'codex': return 'Codex';
      case 'claude-code': return 'Claude Code';
      case 'cursor': return 'Cursor';
    }
  }).join(', ');
}

export function buildNextStepsLines(
  settingsConfig: { workerPort: string },
  selectedIDEs: IDE[],
): string[] {
  const nextStepsLines: string[] = [];

  if (selectedIDEs.includes('codex')) {
    nextStepsLines.push('Open Codex and start a session once transcript watching is configured.');
    nextStepsLines.push('Run: codex-mem codex init');
  }
  if (selectedIDEs.includes('claude-code')) {
    nextStepsLines.push('Open Claude Code and start a conversation - memory is automatic!');
  }
  if (selectedIDEs.includes('cursor')) {
    nextStepsLines.push('Open Cursor - hooks are active in your projects.');
  }

  nextStepsLines.push(`View your memories: http://localhost:${settingsConfig.workerPort}`);
  return nextStepsLines;
}
