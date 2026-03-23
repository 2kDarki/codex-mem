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

## Remaining Work Queue

- [x] Public docs high-traffic pages: finish Codex-first wording/paths in troubleshooting, modes, provider guides, and Cursor OpenRouter setup
- [x] Public docs secondary pages: clean up architecture/overview/history pages where product framing still says Claude-Mem even when describing the current product surface
- [x] Cursor ancillary docs: update parity/review/supporting docs that still mention `claude-mem-context.mdc` or Claude-first branding
- [x] Support templates and repo hygiene: finish feature request template and any remaining high-signal support copy
- [x] Installer polish: rename remaining installer prompts/help copy that still says `claude-mem installer` or `.claude-mem` in user-visible output
- [x] Viewer/settings polish: replace remaining visible defaults like OpenRouter app-name placeholders that still show `claude-mem`
- [x] Public example/config files: sweep remaining user-copied examples for `.claude-mem` defaults where the runtime is now `.Codex-mem`
- [x] Compatibility decision: decide and document whether Claude/Cursor remain supported compatibility hosts or move to a strict Codex-only support stance
- [ ] Follow-up runtime validation: add any remaining end-to-end coverage needed after the compatibility/support decision lands

## Current Slice: Compatibility Decision

- [x] Add failing regression coverage for the documented compatibility-host policy and public Cursor command surface
- [x] Document Codex as the primary runtime while keeping Claude Code and Cursor as supported compatibility hosts
- [x] Verify the policy wording and corrected Cursor command with focused docs regression coverage
- [x] Record the slice in review notes and commit it with a detailed message

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
- [x] Add end-to-end Codex transcript ingestion coverage

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
- Added public `codex-mem cursor ...` routing to the shipped CLI so the documented Cursor install/status commands are actually supported by the published bin.
- Updated the remaining user-facing Cursor docs bundle to Codex-first commands, paths, and rules filenames, and expanded regression coverage across those setup guides.
- Added watcher-level end-to-end Codex transcript tests that exercise JSONL ingestion, worker HTTP calls, AGENTS.md updates, and saved-state resume behavior.
- Fixed a transcript watcher race where overlapping file watch callbacks could re-read the same appended range and replay session-end processing.
- Renamed the remaining generated Cursor user-facing surfaces to Codex-first names, including `codex-mem-context.mdc`, Codex-mem MDC copy, and the `codex-mem` MCP server key while still cleaning up legacy `claude-mem` MCP entries during removal.
- Updated the viewer shell title, header branding, and docs link to Codex-first wording without changing the existing asset filenames or GitHub repository target.
- Cleaned up the selected public docs pages for configuration and beta features so their visible paths, viewer wording, and Codex session guidance align with `.Codex-mem` defaults while preserving the still-current `claude-mem.db` filename where applicable.
- Corrected Cursor installer guidance so the next-step command matches the shipped CLI (`codex-mem worker start`) and the docs link points at the Codex docs host.
- Verified the slice with focused Cursor/docs regression tests and a full build of the viewer, worker, MCP server, and `codex-mem` CLI bundle.
- Updated the public docs site metadata, introduction, installation guide, getting-started guide, Cursor entry docs, issue template log paths, and transcript watch example so new users see Codex-first product wording and `.Codex-mem` defaults at the main entry points.
- Kept repository URLs and compatibility-sensitive historical architecture docs unchanged in this slice, so the change stays focused on entry-point messaging rather than rewriting technical-history pages.
- Added a concrete remaining-work queue so the rest of the migration is sequenced into public docs, ancillary docs, installer polish, viewer/settings polish, examples, compatibility policy, and follow-up runtime validation instead of one broad undefined cleanup pass.
- Updated the next high-traffic public docs pages (`modes`, OpenRouter provider, troubleshooting, and Cursor OpenRouter setup) to use Codex-first descriptions and `.Codex-mem` paths where those pages describe the current product surface.
- Updated the secondary architecture/history docs framing (`architecture/overview`, `architecture/database`, `hooks-architecture`, `architecture/search-architecture`, `architecture/worker-service`, and `architecture-evolution`) so the current product description is Codex-first while intentionally preserving deeper historical examples and migration-era commands.
- Updated the supporting Cursor parity/review docs so they now describe Codex-mem and the generated `codex-mem-context.mdc` rules file consistently with the already-updated primary Cursor setup guides.
- Updated the GitHub support issue templates so the user-facing bug-report and feature-request copy now names Codex-mem explicitly while preserving the real repository issue URL.
- Polished the remaining user-visible installer prompts so the banner, install detection message, provider prompt, and Cursor follow-up command are Codex-first in both installer source and the tracked built installer bundle.
- Polished the remaining visible viewer/settings OpenRouter app-name default so both the shared settings constant and the settings modal fallback/placeholder now show `codex-mem` instead of `claude-mem`.
- Updated the published `install/public` installer assets so the bootstrap banner, temp filename prefix, and bundled installer payload now match the Codex-first installer source and `.Codex-mem` defaults users actually download.
- Made the compatibility policy explicit in the README and public docs: Codex is now the primary runtime/product surface, while Claude Code and Cursor remain supported compatibility hosts on the same worker/database core, and fixed the stale public `claude-mem cursor install` command to `codex-mem cursor install`.
- Remaining work is mostly broader docs/UI copy cleanup, manifest/plugin rename coverage, and Codex end-to-end runtime validation.
