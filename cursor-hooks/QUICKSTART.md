# Quick Start: Codex-mem + Cursor Integration

> **Give your Cursor AI persistent memory in under 5 minutes**

## What This Does

Connects codex-mem to Cursor so that:
- **Agent actions** (MCP tools, shell commands, file edits) are automatically saved
- **Context from past sessions** is automatically injected via `.cursor/rules/`
- **Sessions are summarized** for future reference

Your AI stops forgetting. It remembers the patterns, decisions, and context from previous sessions.

## Using Cursor Without Codex?

If you're using Cursor without Codex transcripts, see [STANDALONE-SETUP.md](STANDALONE-SETUP.md) for setup with free-tier providers like Gemini or OpenRouter.

---

## Installation (1 minute)

```bash
# Install globally for all projects (recommended)
codex-mem cursor install user

# Or install for current project only
codex-mem cursor install

# Check installation status
codex-mem cursor status
```

## Configure Provider (Required for Standalone)

If you're using Cursor without Codex transcripts, configure a provider for AI summarization in `~/.Codex-mem/settings.json`:

```bash
# Option A: Gemini (free tier available - recommended)
mkdir -p ~/.Codex-mem
cat > ~/.Codex-mem/settings.json << 'EOF'
{
  "CLAUDE_MEM_PROVIDER": "gemini",
  "CLAUDE_MEM_GEMINI_API_KEY": "your-api-key"
}
EOF

# Option B: OpenRouter (free models available)
cat > ~/.Codex-mem/settings.json << 'EOF'
{
  "CLAUDE_MEM_PROVIDER": "openrouter",
  "CLAUDE_MEM_OPENROUTER_API_KEY": "your-api-key"
}
EOF
```

**Get free API keys**:
- Gemini: https://aistudio.google.com/apikey
- OpenRouter: https://openrouter.ai/keys

## Start Worker

```bash
codex-mem worker start

# Verify it's running
codex-mem worker status
```

## Restart Cursor

Restart Cursor to load the hooks.

## Verify It's Working

1. Open Cursor Settings → Hooks tab
2. You should see the hooks listed
3. Submit a prompt in Cursor
4. Check the web viewer: http://localhost:37777
5. You should see observations appearing

## What Gets Captured

- **MCP Tool Usage**: All MCP tool executions
- **Shell Commands**: All terminal commands
- **File Edits**: All file modifications
- **Sessions**: Each conversation is tracked

## Accessing Memory

### Via Web Viewer
- Open http://localhost:37777
- Browse sessions, observations, and summaries
- Search your project history

### Via MCP Tools (if enabled)
- codex-mem provides search tools via MCP
- Use `search`, `timeline`, and `get_observations` tools

## Troubleshooting

**Hooks not running?**
- Check Cursor Settings → Hooks tab for errors
- Verify scripts are executable: `chmod +x ~/.cursor/hooks/*.sh`
- Check Hooks output channel in Cursor

**Worker not responding?**
- Check if worker is running: `curl http://127.0.0.1:37777/api/readiness`
- Check logs: `tail -f ~/.Codex-mem/logs/worker-$(date +%Y-%m-%d).log`
- Restart worker: `codex-mem worker restart`

**Observations not saving?**
- Check worker logs for errors
- Verify session was initialized in web viewer
- Test API directly: `curl -X POST http://127.0.0.1:37777/api/sessions/observations ...`

## Next Steps

- Read [README.md](README.md) for detailed documentation
- Read [INTEGRATION.md](INTEGRATION.md) for architecture details
- Visit [codex-mem docs](https://docs.codex-mem.ai) for full feature set

