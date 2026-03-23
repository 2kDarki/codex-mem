import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), 'utf-8');
}

describe('Codex product manifests', () => {
  it('uses codex-mem names in plugin manifests', () => {
    const rootPlugin = JSON.parse(readProjectFile('.codex-plugin/plugin.json'));
    const bundledPlugin = JSON.parse(readProjectFile('plugin/.codex-plugin/plugin.json'));
    const marketplace = JSON.parse(readProjectFile('.codex-plugin/marketplace.json'));

    expect(rootPlugin.name).toBe('codex-mem');
    expect(rootPlugin.description).toContain('Codex');
    expect(bundledPlugin.name).toBe('codex-mem');
    expect(bundledPlugin.description).toContain('Codex');
    expect(marketplace.plugins[0].name).toBe('codex-mem');
    expect(marketplace.plugins[0].description).toContain('Codex');
  });

  it('describes hook distribution as codex-mem', () => {
    const hooks = JSON.parse(readProjectFile('plugin/hooks/hooks.json'));
    expect(hooks.description).toContain('codex-mem');
  });

  it('does not keep the stale claude-mem bundled executable around', () => {
    expect(() => readProjectFile('plugin/scripts/claude-mem')).toThrow();
  });

  it('does not keep Claude-only GitHub workflow helpers around', () => {
    expect(() => readProjectFile('.github/workflows/claude.yml')).toThrow();
    expect(() => readProjectFile('.github/workflows/claude-code-review.yml')).toThrow();
  });
});

describe('Codex product help surfaces', () => {
  it('uses codex-mem in worker CLI help text', () => {
    const workerService = readProjectFile('src/services/worker-service.ts');

    expect(workerService).toContain('Usage: codex-mem hook <platform> <event>');
    expect(workerService).not.toContain('Usage: claude-mem hook <platform> <event>');
  });

  it('uses codex-mem in MCP server identity and logs', () => {
    const mcpServer = readProjectFile('src/servers/mcp-server.ts');

    expect(mcpServer).toContain("name: 'codex-mem'");
    expect(mcpServer).toContain('codex-mem search server started');
  });

  it('uses Codex-mem branding in search API help', () => {
    const searchRoutes = readProjectFile('src/services/worker/http/routes/SearchRoutes.ts');

    expect(searchRoutes).toContain("title: 'Codex-mem Search API'");
    expect(searchRoutes).toContain('project=codex-mem');
  });

  it('uses codex-mem in Cursor integration guidance', () => {
    const cursorInstaller = readProjectFile('src/services/integrations/CursorHooksInstaller.ts');

    expect(cursorInstaller).toContain('Installing Codex-mem Cursor hooks');
    expect(cursorInstaller).toContain('Start codex-mem worker: codex-mem worker start');
    expect(cursorInstaller).toContain('codex-mem-context.mdc');
    expect(cursorInstaller).toContain('Codex-mem Cursor Integration');
    expect(cursorInstaller).toContain('Usage: codex-mem cursor <command> [options]');
    expect(cursorInstaller).toContain('https://docs.codex-mem.ai/cursor');
  });

  it('uses codex-mem as the visible OpenRouter app-name default in viewer settings', () => {
    const contextSettingsModal = readProjectFile('src/ui/viewer/components/ContextSettingsModal.tsx');
    const defaultSettings = readProjectFile('src/ui/viewer/constants/settings.ts');

    expect(contextSettingsModal).toContain("CLAUDE_MEM_OPENROUTER_APP_NAME || 'codex-mem'");
    expect(contextSettingsModal).toContain('placeholder=\"codex-mem\"');
    expect(contextSettingsModal).not.toContain("CLAUDE_MEM_OPENROUTER_APP_NAME || 'claude-mem'");
    expect(defaultSettings).toContain("CLAUDE_MEM_OPENROUTER_APP_NAME: 'codex-mem'");
  });

  it('removes repo-local Claude setup references from support and dev surfaces', () => {
    const bugReport = readProjectFile('.github/ISSUE_TEMPLATE/bug_report.md');
    const conductor = readProjectFile('conductor.json');
    const gitignore = readProjectFile('.gitignore');

    expect(bugReport).not.toContain('~/.claude/plugins/marketplaces/thedotmack');
    expect(bugReport).not.toContain('%USERPROFILE%\\.claude\\plugins\\marketplaces\\thedotmack');
    expect(conductor).not.toContain('.claude/settings.local.json');
    expect(gitignore).not.toContain('.claude/settings.local.json');
    expect(gitignore).not.toContain('.claude/session-intent.md');
  });
});
