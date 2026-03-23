# Codex-Mem Migration Tasklist

## Goal

Turn this repository from a Claude-first memory plugin into a full-fledged Codex-first product while preserving the reusable worker, database, search, and context pipeline.

## Live Tasks

- [x] Establish Codex-first defaults and compatibility boundaries
- [x] Add Codex-first settings/data-dir behavior with backward compatibility
- [x] Promote Codex transcript ingestion from sidecar support to primary runtime path
- [ ] Expose Codex-facing product/install surface instead of Claude-only surface
- [ ] Add tests that lock in Codex defaults, transcript config, and installer behavior
- [x] Verify changed tests pass
- [ ] Update this tasklist with implementation notes and follow-up work

## Phase Breakdown

### Phase 1: Foundational Codex Defaults

- [x] Change default data/config paths from `~/.claude-mem` to `~/.Codex-mem` where safe
- [x] Preserve fallback compatibility for existing Claude-era settings and data
- [x] Add explicit test coverage for new defaults and env alias behavior

### Phase 2: Codex Runtime Path

- [x] Make Codex transcript watch configuration a first-class, shipped path
- [x] Ensure transcript config/state and AGENTS context updates point at Codex locations by default
- [x] Add tests for sample Codex transcript configuration

### Phase 3: Installer and UX

- [ ] Add Codex as a first-class installer target
- [ ] Update installer summaries and next steps to describe Codex usage
- [ ] Move installer defaults toward Codex-first naming and paths
- [ ] Add tests for installer-facing Codex behavior where practical

### Phase 4: Product Surface Follow-Up

- [ ] Introduce a real public `codex-mem` command surface
- [ ] Rename remaining Claude-first user-facing copy, docs, and assets
- [ ] Decide whether to keep Claude/Cursor as compatibility hosts or make Codex-only the primary supported mode
- [ ] Add end-to-end Codex transcript ingestion coverage

## Review Notes

- Added a real `src/bin/codex-mem.ts` CLI entrypoint with `codex`, `transcript`, and `worker` routing.
- Switched transcript watcher defaults to `.Codex-mem` paths while keeping Codex session and `~/.codex/AGENTS.md` targets.
- Added `CODEX_MEM_*` alias support in `SettingsDefaultsManager` for env vars and settings files.
- Default settings now prefer `.Codex-mem` storage and `codex-mem` app naming.
- Remaining work is mostly installer, packaging, docs, and broader user-facing rename coverage.
