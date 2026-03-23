import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path, { join } from 'path';

const mockedDataDir = join(tmpdir(), 'codex-mem-transcript-test-data');
const mockedSettingsPath = join(mockedDataDir, 'settings.json');

mock.module('../../../src/utils/logger.js', () => ({
  logger: {
    info: () => {},
    debug: () => {},
    warn: () => {},
    error: () => {},
    failure: () => {},
    dataIn: () => {},
    formatTool: (toolName: string, toolInput?: unknown) => (toolInput ? `${toolName}(...)` : toolName),
  },
}));

mock.module('../../../src/shared/worker-utils.js', () => ({
  ensureWorkerRunning: () => Promise.resolve(true),
  getWorkerPort: () => 37777,
  getWorkerHost: () => '127.0.0.1',
  clearPortCache: () => {},
  fetchWithTimeout: (url: string, init: RequestInit) => globalThis.fetch(url, init),
  buildWorkerUrl: (apiPath: string) => `http://127.0.0.1:37777${apiPath}`,
  workerHttpRequest: (apiPath: string, options?: { method?: string; headers?: Record<string, string>; body?: string }) =>
    globalThis.fetch(`http://127.0.0.1:37777${apiPath}`, {
      method: options?.method ?? 'GET',
      headers: options?.headers,
      body: options?.body,
    }),
}));

mock.module('../../../src/shared/SettingsDefaultsManager.js', () => ({
  SettingsDefaultsManager: {
    loadFromFile: () => ({ CLAUDE_MEM_EXCLUDED_PROJECTS: [] }),
    get: (key: string) => {
      if (key === 'CLAUDE_MEM_DATA_DIR') return mockedDataDir;
      return '';
    },
    getInt: () => 0,
  },
}));

mock.module('../../../src/shared/paths.js', () => ({
  DATA_DIR: mockedDataDir,
  USER_SETTINGS_PATH: mockedSettingsPath,
  MARKETPLACE_ROOT: mockedDataDir,
}));

mock.module('../../../src/utils/project-filter.js', () => ({
  isProjectExcluded: () => false,
}));

import { SAMPLE_CONFIG } from '../../../src/services/transcripts/config.js';
import { TranscriptWatcher } from '../../../src/services/transcripts/watcher.js';

interface RecordedRequest {
  url: string;
  method: string;
  bodyText?: string;
  body?: unknown;
}

function appendJsonLine(filePath: string, entry: unknown): void {
  appendFileSync(filePath, `${JSON.stringify(entry)}\n`, 'utf-8');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(assertion: () => void, timeoutMs = 4000): Promise<void> {
  const start = Date.now();
  let lastError: unknown;

  while (Date.now() - start < timeoutMs) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await sleep(25);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

describe('Codex transcript watcher end-to-end', () => {
  let tempDir: string;
  let workspaceDir: string;
  let transcriptDir: string;
  let transcriptFile: string;
  let statePath: string;
  let agentsPath: string;
  let requests: RecordedRequest[];
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'codex-mem-transcript-e2e-'));
    workspaceDir = join(tempDir, 'workspace', 'demo-project');
    transcriptDir = join(tempDir, 'sessions');
    transcriptFile = join(transcriptDir, '123e4567-e89b-12d3-a456-426614174000.jsonl');
    statePath = join(tempDir, 'transcript-state.json');
    agentsPath = join(tempDir, 'codex-home', 'AGENTS.md');
    requests = [];

    mkdirSync(workspaceDir, { recursive: true });
    mkdirSync(transcriptDir, { recursive: true });
    writeFileSync(transcriptFile, '', 'utf-8');

    originalFetch = globalThis.fetch;
    globalThis.fetch = mock((url: string | URL | Request, init?: RequestInit) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      const bodyText = typeof init?.body === 'string' ? init.body : undefined;
      let body: unknown = undefined;
      if (bodyText) {
        try {
          body = JSON.parse(bodyText);
        } catch {
          body = bodyText;
        }
      }

      requests.push({
        url: urlString,
        method: init?.method ?? 'GET',
        bodyText,
        body,
      });

      if (urlString.endsWith('/api/sessions/init')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              sessionDbId: 42,
              promptNumber: 1,
              skipped: false,
              contextInjected: false,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }

      if (urlString.endsWith('/sessions/42/init')) {
        return Promise.resolve(
          new Response(JSON.stringify({ status: 'initialized' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }

      if (
        urlString.endsWith('/api/sessions/observations') ||
        urlString.endsWith('/api/sessions/summarize') ||
        urlString.endsWith('/api/sessions/complete')
      ) {
        return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }

      if (urlString.includes('/api/context/inject')) {
        return Promise.resolve(new Response('Recovered context block', { status: 200 }));
      }

      return Promise.reject(new Error(`Unexpected fetch: ${urlString}`));
    }) as typeof globalThis.fetch;
  });

  afterEach(() => {
    mock.restore();
    globalThis.fetch = originalFetch;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('ingests a Codex JSONL session, emits worker calls, and writes AGENTS context', async () => {
    const watcher = new TranscriptWatcher(
      {
        ...SAMPLE_CONFIG,
        watches: [
          {
            ...SAMPLE_CONFIG.watches[0],
            path: transcriptFile,
            startAtEnd: false,
            rescanIntervalMs: 50,
            context: {
              mode: 'agents',
              path: agentsPath,
              updateOn: ['session_start', 'session_end'],
            },
          },
        ],
        stateFile: statePath,
      },
      statePath,
    );

    try {
      await watcher.start();

      appendJsonLine(transcriptFile, {
        type: 'session_meta',
        payload: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          cwd: workspaceDir,
        },
      });
      appendJsonLine(transcriptFile, {
        type: 'turn',
        payload: {
          type: 'user_message',
          message: 'Implement transcript plumbing',
        },
      });
      appendJsonLine(transcriptFile, {
        type: 'turn',
        payload: {
          type: 'function_call',
          call_id: 'call-1',
          name: 'apply_patch',
          arguments: '*** Begin Patch\n*** Update File: src/app.ts\n+hello\n*** End Patch\n',
        },
      });
      appendJsonLine(transcriptFile, {
        type: 'turn',
        payload: {
          type: 'function_call_output',
          call_id: 'call-1',
          output: '{"status":"ok"}',
        },
      });
      appendJsonLine(transcriptFile, {
        type: 'turn',
        payload: {
          type: 'agent_message',
          message: 'Patched the file.',
        },
      });
      appendJsonLine(transcriptFile, {
        type: 'turn',
        payload: {
          type: 'turn_aborted',
        },
      });

      await waitFor(() => {
        const completeCalls = requests.filter((request) => request.url.endsWith('/api/sessions/complete'));
        expect(completeCalls.length).toBe(1);
        expect(existsSync(agentsPath)).toBe(true);
      });

      const initCall = requests.find((request) => request.url.endsWith('/api/sessions/init'));
      expect(initCall?.body).toEqual({
        contentSessionId: '123e4567-e89b-12d3-a456-426614174000',
        project: 'demo-project',
        prompt: 'Implement transcript plumbing',
      });

      const sdkInitCall = requests.find((request) => request.url.endsWith('/sessions/42/init'));
      expect(sdkInitCall?.body).toEqual({
        userPrompt: 'Implement transcript plumbing',
        promptNumber: 1,
      });

      const observationBodies = requests
        .filter((request) => request.url.endsWith('/api/sessions/observations'))
        .map((request) => request.body as Record<string, unknown>);

      expect(observationBodies).toHaveLength(2);
      expect(observationBodies).toContainEqual({
        contentSessionId: '123e4567-e89b-12d3-a456-426614174000',
        tool_name: 'write_file',
        tool_input: {
          filePath: 'src/app.ts',
          edits: [
            {
              type: 'apply_patch',
              patch: '*** Begin Patch\n*** Update File: src/app.ts\n+hello\n*** End Patch\n',
            },
          ],
        },
        tool_response: { success: true },
        cwd: workspaceDir,
      });
      expect(observationBodies).toContainEqual({
        contentSessionId: '123e4567-e89b-12d3-a456-426614174000',
        tool_name: 'apply_patch',
        tool_input: '*** Begin Patch\n*** Update File: src/app.ts\n+hello\n*** End Patch\n',
        tool_response: { status: 'ok' },
        cwd: workspaceDir,
      });

      const summaryCall = requests.find((request) => request.url.endsWith('/api/sessions/summarize'));
      expect(summaryCall?.body).toEqual({
        contentSessionId: '123e4567-e89b-12d3-a456-426614174000',
        last_assistant_message: 'Patched the file.',
      });

      const contextCalls = requests.filter((request) => request.url.includes('/api/context/inject'));
      expect(contextCalls).toHaveLength(2);
      expect(contextCalls[0]?.url).toContain('projects=demo-project');

      const agentsContent = readFileSync(agentsPath, 'utf-8');
      expect(agentsContent).toContain('<codex-mem-context>');
      expect(agentsContent).toContain('# Memory Context');
      expect(agentsContent).toContain('Recovered context block');

      const state = JSON.parse(readFileSync(statePath, 'utf-8')) as { offsets: Record<string, number> };
      expect(state.offsets[transcriptFile]).toBe(statSync(transcriptFile).size);
    } finally {
      watcher.stop();
    }
  });

  it('resumes from saved state without replaying old transcript lines', async () => {
    const config = {
      ...SAMPLE_CONFIG,
      watches: [
        {
          ...SAMPLE_CONFIG.watches[0],
          path: transcriptFile,
          startAtEnd: false,
          rescanIntervalMs: 50,
          context: {
            mode: 'agents' as const,
            path: agentsPath,
            updateOn: ['session_end'] as Array<'session_end'>,
          },
        },
      ],
      stateFile: statePath,
    };

    const firstWatcher = new TranscriptWatcher(config, statePath);
    try {
      await firstWatcher.start();

      appendJsonLine(transcriptFile, {
        type: 'session_meta',
        payload: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          cwd: workspaceDir,
        },
      });
      appendJsonLine(transcriptFile, {
        type: 'turn',
        payload: {
          type: 'user_message',
          message: 'Replay protection',
        },
      });
      appendJsonLine(transcriptFile, {
        type: 'turn',
        payload: {
          type: 'agent_message',
          message: 'Done.',
        },
      });
      appendJsonLine(transcriptFile, {
        type: 'turn',
        payload: {
          type: 'turn_aborted',
        },
      });

      await waitFor(() => {
        const completeCalls = requests.filter((request) => request.url.endsWith('/api/sessions/complete'));
        expect(completeCalls.length).toBe(1);
      });
    } finally {
      firstWatcher.stop();
    }

    expect(existsSync(statePath)).toBe(true);

    requests = [];

    const secondWatcher = new TranscriptWatcher(config, statePath);
    try {
      await secondWatcher.start();
      await sleep(250);
    } finally {
      secondWatcher.stop();
    }

    expect(requests).toHaveLength(0);
  });
});
