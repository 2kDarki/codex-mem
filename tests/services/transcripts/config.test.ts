import { describe, expect, it } from 'bun:test';
import {
  DEFAULT_CONFIG_PATH,
  DEFAULT_STATE_PATH,
  SAMPLE_CONFIG,
} from '../../../src/services/transcripts/config.js';

describe('Transcript config defaults', () => {
  it('uses Codex-mem paths for transcript config and state', () => {
    expect(DEFAULT_CONFIG_PATH).toContain('.Codex-mem');
    expect(DEFAULT_CONFIG_PATH).toEndWith('transcript-watch.json');
    expect(DEFAULT_STATE_PATH).toContain('.Codex-mem');
    expect(DEFAULT_STATE_PATH).toEndWith('transcript-watch-state.json');
  });

  it('ships a Codex watch config that targets Codex sessions and AGENTS', () => {
    expect(SAMPLE_CONFIG.watches).toHaveLength(1);
    expect(SAMPLE_CONFIG.watches[0]?.name).toBe('codex');
    expect(SAMPLE_CONFIG.watches[0]?.path).toBe('~/.codex/sessions/**/*.jsonl');
    expect(SAMPLE_CONFIG.watches[0]?.context?.path).toBe('~/.codex/AGENTS.md');
    expect(SAMPLE_CONFIG.stateFile).toContain('.Codex-mem');
  });
});
