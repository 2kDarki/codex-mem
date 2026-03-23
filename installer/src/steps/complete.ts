import * as p from '@clack/prompts';
import pc from 'picocolors';
import type { ProviderConfig } from './provider.js';
import type { SettingsConfig } from './settings.js';
import type { IDE } from './ide-selection.js';
import { buildNextStepsLines, getIDELabels } from '../utils/product-surface.js';

function getProviderLabel(config: ProviderConfig): string {
  switch (config.provider) {
    case 'claude':
      return config.claudeAuthMethod === 'api' ? 'Claude (API Key)' : 'Claude (CLI subscription)';
    case 'gemini':
      return `Gemini (${config.model ?? 'gemini-2.5-flash-lite'})`;
    case 'openrouter':
      return `OpenRouter (${config.model ?? 'xiaomi/mimo-v2-flash:free'})`;
  }
}

export function runCompletion(
  providerConfig: ProviderConfig,
  settingsConfig: SettingsConfig,
  selectedIDEs: IDE[],
): void {
  const summaryLines = [
    `Provider:   ${pc.cyan(getProviderLabel(providerConfig))}`,
    `IDEs:       ${pc.cyan(getIDELabels(selectedIDEs))}`,
    `Data dir:   ${pc.cyan(settingsConfig.dataDir)}`,
    `Port:       ${pc.cyan(settingsConfig.workerPort)}`,
    `Chroma:     ${settingsConfig.chromaEnabled ? pc.green('enabled') : pc.dim('disabled')}`,
  ];

  p.note(summaryLines.join('\n'), 'Configuration Summary');

  const nextStepsLines = buildNextStepsLines(settingsConfig, selectedIDEs).map((line) => {
    if (line.startsWith('View your memories: http://localhost:')) {
      return `View your memories: ${pc.underline(`http://localhost:${settingsConfig.workerPort}`)}`;
    }
    if (line === 'Run: codex-mem codex init') {
      return `Run: ${pc.bold('codex-mem codex init')}`;
    }
    return line;
  });

  p.note(nextStepsLines.join('\n'), 'Next Steps');

  p.outro(pc.green('codex-mem installed successfully!'));
}
