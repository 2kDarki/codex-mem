# Codex-Mem Migration Tasklist

## Goal

Turn this repository from a Claude-first memory plugin into a full-fledged Codex-first product while preserving the reusable worker, database, search, and context pipeline.

## Live Tasks

- [x] Establish Codex-first defaults and compatibility boundaries
- [x] Add Codex-first settings/data-dir behavior with backward compatibility
- [x] Promote Codex transcript ingestion from sidecar support to primary runtime path
- [x] Expose Codex-facing product/install surface instead of Claude-only surface
- [x] Add tests that lock in Codex defaults, transcript config, and installer behavior
- [x] Verify changed tests pass
- [x] Update this tasklist with implementation notes and follow-up work

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

- [x] Add Codex as a first-class installer target
- [x] Update installer summaries and next steps to describe Codex usage
- [x] Move installer defaults toward Codex-first naming and paths
- [x] Add tests for installer-facing Codex behavior where practical

### Phase 4: Product Surface Follow-Up

- [x] Introduce a real public `codex-mem` command surface
- [x] Wire published package metadata and `bin` output to Codex-first names
- [x] Build and ship a `codex-mem` executable alongside existing worker artifacts
- [x] Move marketplace sync/build defaults from Claude plugin paths to Codex plugin paths
- [ ] Rename remaining Claude-first user-facing copy, docs, and assets
- [ ] Decide whether to keep Claude/Cursor as compatibility hosts or make Codex-only the primary supported mode
- [ ] Add end-to-end Codex transcript ingestion coverage

## Review Notes

- Added a real `src/bin/codex-mem.ts` CLI entrypoint with `codex`, `transcript`, and `worker` routing.
- Switched transcript watcher defaults to `.Codex-mem` paths while keeping Codex session and `~/.codex/AGENTS.md` targets.
- Added `CODEX_MEM_*` alias support in `SettingsDefaultsManager` for env vars and settings files.
- Default settings now prefer `.Codex-mem` storage and `codex-mem` app naming.
- Added installer product-surface helpers so Codex appears as a first-class target, default installer data goes to `~/.Codex-mem`, and completion messaging points users toward `codex-mem codex init`.
- Renamed the root package surface to `codex-mem`, added a real published `bin`, and introduced a bundled `plugin/scripts/codex-mem.cjs` CLI artifact through the existing build pipeline.
- Switched package-level sync/log scripts and marketplace sync defaults to Codex plugin/data directories while keeping the underlying Claude plugin manifests untouched for now.
- Renamed the highest-visibility shipped manifests and help surfaces to `codex-mem`, including marketplace/plugin manifests, hook descriptions, search API help, worker/MCP help text, and Cursor integration guidance.
- Updated the main README, Cursor hooks guide, and shipped English mode prompts to Codex-first wording, commands, config paths, and context filenames.
- Added docs/content regression coverage that locks the README, Cursor guide, and English mode prompts to Codex-first product wording.
- Remaining work is mostly broader docs/UI copy cleanup, manifest/plugin rename coverage, and Codex end-to-end runtime validation.
