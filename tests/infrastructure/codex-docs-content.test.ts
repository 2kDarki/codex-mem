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

  it('uses codex-mem commands and context file names in the Cursor guide', () => {
    const cursorReadme = readProjectFile('cursor-hooks/README.md');

    expect(cursorReadme).toContain('# Codex-mem Cursor Hooks Integration');
    expect(cursorReadme).toContain('codex-mem cursor install');
    expect(cursorReadme).toContain('.cursor/rules/codex-mem-context.mdc');
    expect(cursorReadme).toContain('`~/.Codex-mem/settings.json`');
    expect(cursorReadme).not.toContain('claude-mem cursor install');
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
