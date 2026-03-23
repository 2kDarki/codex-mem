import * as p from '@clack/prompts';
import { INSTALLER_IDE_OPTIONS } from '../utils/product-surface.js';

export type IDE = 'codex' | 'claude-code' | 'cursor';

export async function runIdeSelection(): Promise<IDE[]> {
  const result = await p.multiselect({
    message: 'Which IDEs do you use?',
    options: INSTALLER_IDE_OPTIONS,
    initialValues: ['codex'],
    required: true,
  });

  if (p.isCancel(result)) {
    p.cancel('Installation cancelled.');
    process.exit(0);
  }

  const selectedIDEs = result as IDE[];

  if (selectedIDEs.includes('codex')) {
    p.log.info('Codex: Transcript-based memory will be configured.');
  }
  if (selectedIDEs.includes('claude-code')) {
    p.log.info('Claude Code: Plugin will be registered via marketplace.');
  }
  if (selectedIDEs.includes('cursor')) {
    p.log.info('Cursor: Hooks will be configured for your projects.');
  }

  return selectedIDEs;
}
