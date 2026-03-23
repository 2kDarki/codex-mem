import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), 'utf-8');
}

describe('Codex docs and content surfaces', () => {
  it('uses codex-mem quick start and config paths in the main README', () => {
    const readme = readProjectFile('README.md');

    expect(readme).toContain('Persistent memory compression system built for Codex');
    expect(readme).toContain('npm install -g codex-mem');
    expect(readme).toContain('codex-mem codex init');
    expect(readme).toContain('codex-mem codex watch');
    expect(readme).toContain('`~/.Codex-mem/settings.json`');
    expect(readme).not.toContain('Start a new Claude Code session');
  });

  it('uses codex-mem branding in the viewer shell and public docs pages', () => {
    const viewerTemplate = readProjectFile('src/ui/viewer-template.html');
    const viewerHeader = readProjectFile('src/ui/viewer/components/Header.tsx');
    const configurationDoc = readProjectFile('docs/public/configuration.mdx');
    const betaFeaturesDoc = readProjectFile('docs/public/beta-features.mdx');

    expect(viewerTemplate).toContain('<title>codex-mem viewer</title>');
    expect(viewerHeader).toContain('<span className="logo-text">codex-mem</span>');
    expect(viewerHeader).toContain('https://docs.codex-mem.ai');

    expect(configurationDoc).toContain('description: "Environment variables and settings for Codex-mem"');
    expect(configurationDoc).toContain('Settings are managed in `~/.Codex-mem/settings.json`.');
    expect(configurationDoc).toContain('| `CLAUDE_MEM_OPENROUTER_APP_NAME`             | `codex-mem`');
    expect(configurationDoc).toContain('| `CLAUDE_MEM_DATA_DIR`         | `~/.Codex-mem`');

    expect(betaFeaturesDoc).toContain('Codex-mem offers a beta channel');
    expect(betaFeaturesDoc).toContain('Open the Codex-mem viewer');
    expect(betaFeaturesDoc).toContain('`~/.Codex-mem/claude-mem.db`');
    expect(betaFeaturesDoc).toContain('In standard Codex sessions:');
  });

  it('uses codex-first branding in docs entry points and support templates', () => {
    const docsConfig = readProjectFile('docs/public/docs.json');
    const introduction = readProjectFile('docs/public/introduction.mdx');
    const installation = readProjectFile('docs/public/installation.mdx');
    const gettingStarted = readProjectFile('docs/public/usage/getting-started.mdx');
    const cursorIndex = readProjectFile('docs/public/cursor/index.mdx');
    const cursorGeminiSetup = readProjectFile('docs/public/cursor/gemini-setup.mdx');
    const bugReport = readProjectFile('.github/ISSUE_TEMPLATE/bug_report.md');
    const featureRequest = readProjectFile('.github/ISSUE_TEMPLATE/feature_request.md');
    const transcriptWatchExample = readProjectFile('transcript-watch.example.json');

    expect(docsConfig).toContain('"name": "Codex-mem"');
    expect(docsConfig).toContain('Codex-mem Documentation');
    expect(docsConfig).toContain('preserves context across Codex sessions');

    expect(introduction).toContain('# Codex-mem');
    expect(introduction).toContain('Persistent memory compression system for Codex');
    expect(introduction).toContain('npm install -g codex-mem');
    expect(introduction).toContain('codex-mem codex init');

    expect(installation).toContain('Install codex-mem from npm');
    expect(installation).toContain('codex-mem codex init');
    expect(installation).toContain('codex-mem codex watch');
    expect(installation).toContain('`~/.Codex-mem/`');

    expect(gettingStarted).toContain('# Getting Started with Codex-mem');
    expect(gettingStarted).toContain('Start Codex');
    expect(gettingStarted).toContain('codex-mem worker start');
    expect(gettingStarted).toContain('`~/.Codex-mem/claude-mem.db`');

    expect(cursorIndex).toContain('Codex-mem changes that.');
    expect(cursorIndex).toContain('No Codex subscription required');
    expect(cursorIndex).toContain('Detect you do not have Codex installed');

    expect(cursorGeminiSetup).toContain('Use Codex-mem in Cursor');
    expect(cursorGeminiSetup).toContain('## Step 2: Clone and Build Codex-mem');
    expect(cursorGeminiSetup).toContain('mkdir -p ~/.Codex-mem');
    expect(cursorGeminiSetup).toContain('cat ~/.Codex-mem/settings.json');

    expect(bugReport).toContain('**Codex version**:');
    expect(bugReport).toContain('`~/.Codex-mem/logs/worker-YYYY-MM-DD.log`');
    expect(featureRequest).toContain('https://github.com/thedotmack/claude-mem/issues');

    expect(transcriptWatchExample).toContain('"stateFile": "~/.Codex-mem/transcript-watch-state.json"');
  });

  it('uses codex-first wording in the next high-traffic docs pages', () => {
    const modes = readProjectFile('docs/public/modes.mdx');
    const openRouterProvider = readProjectFile('docs/public/usage/openrouter-provider.mdx');
    const troubleshooting = readProjectFile('docs/public/troubleshooting.mdx');
    const cursorOpenRouter = readProjectFile('docs/public/cursor/openrouter-setup.mdx');
    const featureRequest = readProjectFile('.github/ISSUE_TEMPLATE/feature_request.md');

    expect(modes).toContain('description: "Configure Codex-mem behavior and language with the Mode System"');
    expect(modes).toContain('Codex-mem uses a flexible **Mode System**');
    expect(modes).toContain('`~/.Codex-mem/settings.json`');

    expect(openRouterProvider).toContain('Codex-mem supports [OpenRouter]');
    expect(openRouterProvider).toContain('| `CLAUDE_MEM_OPENROUTER_APP_NAME` | string | `codex-mem` |');
    expect(openRouterProvider).toContain('Edit `~/.Codex-mem/settings.json`:');
    expect(openRouterProvider).toContain('X-Title: codex-mem');

    expect(troubleshooting).toContain('description: "Common issues and solutions for Codex-mem"');
    expect(troubleshooting).toContain('localStorage.getItem(\'codex-mem-settings\')');
    expect(troubleshooting).toContain('`~/.Codex-mem/` exists and is writable.');

    expect(cursorOpenRouter).toContain('description: "Use Codex-mem in Cursor with OpenRouter\'s 100+ AI models"');
    expect(cursorOpenRouter).toContain('## Step 2: Clone and Build Codex-mem');
    expect(cursorOpenRouter).toContain('mkdir -p ~/.Codex-mem');
    expect(cursorOpenRouter).toContain('cat ~/.Codex-mem/settings.json');

    expect(featureRequest).toContain('https://github.com/thedotmack/claude-mem/issues');
  });

  it('uses codex-first framing in secondary architecture docs', () => {
    const architectureOverview = readProjectFile('docs/public/architecture/overview.mdx');
    const databaseArchitecture = readProjectFile('docs/public/architecture/database.mdx');
    const hooksArchitecture = readProjectFile('docs/public/hooks-architecture.mdx');
    const searchArchitecture = readProjectFile('docs/public/architecture/search-architecture.mdx');
    const workerService = readProjectFile('docs/public/architecture/worker-service.mdx');
    const architectureEvolution = readProjectFile('docs/public/architecture-evolution.mdx');

    expect(architectureOverview).toContain('description: "System components and data flow in Codex-mem"');
    expect(architectureOverview).toContain('Codex-mem operates as a Codex-first memory system');
    expect(architectureOverview).toContain('`~/.Codex-mem/claude-mem.db`');

    expect(databaseArchitecture).toContain('Codex-mem uses SQLite 3');
    expect(databaseArchitecture).toContain('**Path**: `~/.Codex-mem/claude-mem.db`');

    expect(hooksArchitecture).toContain('# How Codex-mem Uses Hooks');
    expect(hooksArchitecture).toContain('Codex-mem is fundamentally a **hook-driven system**');

    expect(searchArchitecture).toContain('Codex-mem uses an **MCP-based search architecture**');
    expect(workerService).toContain('Codex-mem processes observations through the Claude Agent SDK');

    expect(architectureEvolution).toContain('description: "How Codex-mem evolved from v3 to v5+"');
    expect(architectureEvolution).toContain('This is the story of how Codex-mem evolved');
  });

  it('uses codex-mem commands and context file names in the Cursor guide', () => {
    const cursorReadme = readProjectFile('cursor-hooks/README.md');

    expect(cursorReadme).toContain('# Codex-mem Cursor Hooks Integration');
    expect(cursorReadme).toContain('codex-mem cursor install');
    expect(cursorReadme).toContain('.cursor/rules/codex-mem-context.mdc');
    expect(cursorReadme).toContain('`~/.Codex-mem/settings.json`');
    expect(cursorReadme).not.toContain('claude-mem cursor install');
  });

  it('uses codex-mem commands and paths in the remaining Cursor docs bundle', () => {
    const contextInjection = readProjectFile('cursor-hooks/CONTEXT-INJECTION.md');
    const quickstart = readProjectFile('cursor-hooks/QUICKSTART.md');
    const standaloneSetup = readProjectFile('cursor-hooks/STANDALONE-SETUP.md');
    const cursorRulesTemplate = readProjectFile('cursor-hooks/cursorrules-template.md');
    const integration = readProjectFile('cursor-hooks/INTEGRATION.md');

    expect(contextInjection).toContain('codex-mem cursor install');
    expect(contextInjection).toContain('.cursor/rules/codex-mem-context.mdc');
    expect(contextInjection).toContain('~/.Codex-mem/cursor-projects.json');
    expect(contextInjection).not.toContain('claude-mem cursor install');

    expect(quickstart).toContain('# Quick Start: Codex-mem + Cursor Integration');
    expect(quickstart).toContain('codex-mem cursor install user');
    expect(quickstart).toContain('codex-mem worker start');
    expect(quickstart).toContain('~/.Codex-mem/logs/');
    expect(quickstart).toContain('https://docs.codex-mem.ai');
    expect(quickstart).not.toContain('claude-mem cursor install');

    expect(standaloneSetup).toContain('# Codex-mem for Cursor');
    expect(standaloneSetup).toContain('~/.Codex-mem/settings.json');
    expect(standaloneSetup).toContain('codex-mem cursor install');
    expect(standaloneSetup).toContain('https://docs.codex-mem.ai');
    expect(standaloneSetup).not.toContain('Use claude-mem');

    expect(cursorRulesTemplate).toContain('# Codex-mem Rules for Cursor');
    expect(cursorRulesTemplate).toContain('.cursor/rules/codex-mem-context.mdc');
    expect(cursorRulesTemplate).toContain('.cursor/rules/codex-mem-instructions.mdc');
    expect(cursorRulesTemplate).not.toContain('.cursor/rules/claude-mem-context.mdc');

    expect(integration).toContain('# Codex-mem ↔ Cursor Integration Architecture');
    expect(integration).toContain('~/.Codex-mem/settings.json');
    expect(integration).toContain('Initialize session in codex-mem');
    expect(integration).toContain('Map to codex-mem observation format');
    expect(integration).not.toContain('Claude-Mem Worker Service');
  });

  it('uses Codex-first observer wording in the shipped English mode prompts', () => {
    const codeMode = readProjectFile('plugin/modes/code.json');
    const emailInvestigationMode = readProjectFile('plugin/modes/email-investigation.json');
    const lawStudyMode = readProjectFile('plugin/modes/law-study.json');

    expect(codeMode).toContain('You are a Codex-mem');
    expect(codeMode).toContain('monitor a different Codex session');
    expect(codeMode).toContain("Codex's Full Response to User:");
    expect(codeMode).not.toContain('You are a Claude-Mem');

    expect(emailInvestigationMode).toContain('You are a Codex-mem');
    expect(emailInvestigationMode).toContain("Codex's Full Investigation Response:");
    expect(emailInvestigationMode).not.toContain('You are a Claude-Mem');

    expect(lawStudyMode).toContain('You are Codex-mem');
    expect(lawStudyMode).toContain('monitor a different Codex session');
    expect(lawStudyMode).toContain("Codex's Full Response to User:");
    expect(lawStudyMode).not.toContain('You are Claude-Mem');
  });
});
