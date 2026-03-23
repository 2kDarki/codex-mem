#!/usr/bin/env bun
/**
 * Regenerate AGENTS.md files for folders in the current project
 *
 * Usage:
 *   bun scripts/regenerate-agents-md.ts [--dry-run] [--clean]
 *
 * Options:
 *   --dry-run  Show what would be done without writing files
 *   --clean    Remove auto-generated AGENTS.md files instead of regenerating
 *
 * Behavior:
 *   - Scopes to current working directory (not entire database history)
 *   - Uses git ls-files to respect .gitignore (skips node_modules, .git, etc.)
 *   - Only processes folders that exist within the current project
 *   - Filters database to current project observations only
 */

import { Database } from 'bun:sqlite';
import path from 'path';
import os from 'os';
import { existsSync, mkdirSync, writeFileSync, readFileSync, renameSync, unlinkSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { SettingsDefaultsManager } from '../src/shared/SettingsDefaultsManager.js';

const DB_PATH = path.join(os.homedir(), '.Codex-mem', 'claude-mem.db');
const SETTINGS_PATH = path.join(os.homedir(), '.Codex-mem', 'settings.json');
const settings = SettingsDefaultsManager.loadFromFile(SETTINGS_PATH);
const OBSERVATION_LIMIT = parseInt(settings.CLAUDE_MEM_CONTEXT_OBSERVATIONS, 10) || 50;

interface ObservationRow {
  id: number;
  title: string | null;
  subtitle: string | null;
  narrative: string | null;
  facts: string | null;
  type: string;
  created_at: string;
  created_at_epoch: number;
  files_modified: string | null;
  files_read: string | null;
  project: string;
  discovery_tokens: number | null;
}

// Import shared utilities
import { formatTime, groupByDate } from '../src/shared/timeline-formatting.js';
import { isDirectChild } from '../src/shared/path-utils.js';
import { replaceTaggedContent } from '../src/utils/folder-context-utils.js';

// Type icon map (matches ModeManager)
const TYPE_ICONS: Record<string, string> = {
  'bugfix': '🔴',
  'feature': '🟣',
  'refactor': '🔄',
  'change': '✅',
  'discovery': '🔵',
  'decision': '⚖️',
  'session': '🎯',
  'prompt': '💬'
};

function getTypeIcon(type: string): string {
  return TYPE_ICONS[type] || '📝';
}

function estimateTokens(obs: ObservationRow): number {
  const size = (obs.title?.length || 0) +
    (obs.subtitle?.length || 0) +
    (obs.narrative?.length || 0) +
    (obs.facts?.length || 0);
  return Math.ceil(size / 4);
}

/**
 * Get tracked folders using git ls-files
 * This respects .gitignore and only returns folders within the project
 */
function getTrackedFolders(workingDir: string): Set<string> {
  const folders = new Set<string>();

  try {
    // Get all tracked files using git ls-files
    const output = execSync('git ls-files', {
      cwd: workingDir,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large repos
    });

    const files = output.trim().split('\n').filter(f => f);

    for (const file of files) {
      // Get the absolute path, then extract directory
      const absPath = path.join(workingDir, file);
      let dir = path.dirname(absPath);

      // Add all parent directories up to (but not including) the working dir
      while (dir.length > workingDir.length && dir.startsWith(workingDir)) {
        folders.add(dir);
        dir = path.dirname(dir);
      }
    }
  } catch (error) {
    console.error('Warning: git ls-files failed, falling back to directory walk');
    // Fallback: walk directories but skip common ignored patterns
    walkDirectoriesWithIgnore(workingDir, folders);
  }

  return folders;
}

/**
 * Fallback directory walker that skips common ignored patterns
 */
function walkDirectoriesWithIgnore(dir: string, folders: Set<string>, depth: number = 0): void {
  if (depth > 10) return; // Prevent infinite recursion

  const ignorePatterns = [
    'node_modules', '.git', '.next', 'dist', 'build', '.cache',
    '__pycache__', '.venv', 'venv', '.idea', '.vscode', 'coverage',
    '.Codex-mem', '.open-next', '.turbo'
  ];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (ignorePatterns.includes(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.codex') continue;

      const fullPath = path.join(dir, entry.name);
      folders.add(fullPath);
      walkDirectoriesWithIgnore(fullPath, folders, depth + 1);
    }
  } catch {
    // Ignore permission errors
  }
}

/**
 * Check if an observation has any files that are direct children of the folder
 */
function hasDirectChildFile(obs: ObservationRow, folderPath: string): boolean {
  const checkFiles = (filesJson: string | null): boolean => {
    if (!filesJson) return false;
    try {
      const files = JSON.parse(filesJson);
      if (Array.isArray(files)) {
        return files.some(f => isDirectChild(f, folderPath));
      }
    } catch {}
    return false;
  };

  return checkFiles(obs.files_modified) || checkFiles(obs.files_read);
}

/**
 * Query observations for a specific folder
 * folderPath is a relative path from the project root (e.g., "src/services")
 * Only returns observations with files directly in the folder (not in subfolders)
 */
function findObservationsByFolder(db: Database, relativeFolderPath: string, project: string, limit: number): ObservationRow[] {
  // Query more results than needed since we'll filter some out
  const queryLimit = limit * 3;

  const sql = `
    SELECT o.*, o.discovery_tokens
    FROM observations o
    WHERE o.project = ?
      AND (o.files_modified LIKE ? OR o.files_read LIKE ?)
    ORDER BY o.created_at_epoch DESC
    LIMIT ?
  `;

  // Files in DB are stored as relative paths like "src/services/foo.ts"
  // Match any file that starts with this folder path (we'll filter to direct children below)
  const likePattern = `%"${relativeFolderPath}/%`;
  const allMatches = db.prepare(sql).all(project, likePattern, likePattern, queryLimit) as ObservationRow[];

  // Filter to only observations with direct child files (not in subfolders)
  return allMatches.filter(obs => hasDirectChildFile(obs, relativeFolderPath)).slice(0, limit);
}

/**
 * Extract relevant file from an observation for display
 * Only returns files that are direct children of the folder (not in subfolders)
 * @param obs - The observation row
 * @param relativeFolder - Relative folder path (e.g., "src/services")
 */
function extractRelevantFile(obs: ObservationRow, relativeFolder: string): string {
  // Try files_modified first - only direct children
  if (obs.files_modified) {
    try {
      const modified = JSON.parse(obs.files_modified);
      if (Array.isArray(modified) && modified.length > 0) {
        for (const file of modified) {
          if (isDirectChild(file, relativeFolder)) {
            // Get just the filename (no path since it's a direct child)
            return path.basename(file);
          }
        }
      }
    } catch {}
  }

  // Fall back to files_read - only direct children
  if (obs.files_read) {
    try {
      const read = JSON.parse(obs.files_read);
      if (Array.isArray(read) && read.length > 0) {
        for (const file of read) {
          if (isDirectChild(file, relativeFolder)) {
            return path.basename(file);
          }
        }
      }
    } catch {}
  }

  return 'General';
}

/**
 * Format observations for AGENTS.md content
 */
function formatObservationsForAgentsMd(observations: ObservationRow[], folderPath: string): string {
  const lines: string[] = [];
  lines.push('# Recent Activity');
  lines.push('');

  if (observations.length === 0) {
    return '';
  }

  const byDate = groupByDate(observations, obs => obs.created_at);

  for (const [day, dayObs] of byDate) {
    lines.push(`### ${day}`);
    lines.push('');

    const byFile = new Map<string, ObservationRow[]>();
    for (const obs of dayObs) {
      const file = extractRelevantFile(obs, folderPath);
      if (!byFile.has(file)) byFile.set(file, []);
      byFile.get(file)!.push(obs);
    }

    for (const [file, fileObs] of byFile) {
      lines.push(`**${file}**`);
      lines.push('| ID | Time | T | Title | Read |');
      lines.push('|----|------|---|-------|------|');

      let lastTime = '';
      for (const obs of fileObs) {
        const time = formatTime(obs.created_at_epoch);
        const timeDisplay = time === lastTime ? '"' : time;
        lastTime = time;

        const icon = getTypeIcon(obs.type);
        const title = obs.title || 'Untitled';
        const tokens = estimateTokens(obs);

        lines.push(`| #${obs.id} | ${timeDisplay} | ${icon} | ${title} | ~${tokens} |`);
      }

      lines.push('');
    }
  }

  return lines.join('\n').trim();
}


/**
 * Write AGENTS.md file with tagged content preservation
 * Note: For the CLI regenerate tool, we DO create directories since the user
 * explicitly requested regeneration. This differs from the runtime behavior
 * which only writes to existing folders.
 */
function writeAgentsMdToFolderForRegenerate(folderPath: string, newContent: string): void {
  const resolvedPath = path.resolve(folderPath);

  // Never write inside .git directories — corrupts refs (#1165)
  if (resolvedPath.includes('/.git/') || resolvedPath.includes('\\.git\\') || resolvedPath.endsWith('/.git') || resolvedPath.endsWith('\\.git')) return;

  const agentsMdPath = path.join(folderPath, 'AGENTS.md');
  const tempFile = `${agentsMdPath}.tmp`;

  // For regenerate CLI, we create the folder if needed
  mkdirSync(folderPath, { recursive: true });

  // Read existing content if file exists
  let existingContent = '';
  if (existsSync(agentsMdPath)) {
    existingContent = readFileSync(agentsMdPath, 'utf-8');
  }

  // Use shared utility to preserve user content outside tags
  const finalContent = replaceTaggedContent(existingContent, newContent);

  // Atomic write: temp file + rename
  writeFileSync(tempFile, finalContent);
  renameSync(tempFile, agentsMdPath);
}

/**
 * Clean up auto-generated AGENTS.md files
 *
 * For each file with <codex-mem-context> tags:
 * - Strip the tagged section
 * - If empty after stripping → delete the file
 * - If has remaining content → save the stripped version
 */
function cleanupAutoGeneratedFiles(workingDir: string, dryRun: boolean): void {
  console.log('=== AGENTS.md Cleanup Mode ===\n');
  console.log(`Scanning ${workingDir} for AGENTS.md files with auto-generated content...\n`);

  const filesToProcess: string[] = [];

  // Walk directories to find AGENTS.md files
  function walkForAgentsMd(dir: string): void {
    const ignorePatterns = ['node_modules', '.git', '.next', 'dist', 'build'];

    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!ignorePatterns.includes(entry.name)) {
            walkForAgentsMd(fullPath);
          }
        } else if (entry.name === 'AGENTS.md') {
          // Check if file contains auto-generated content
          try {
            const content = readFileSync(fullPath, 'utf-8');
            if (content.includes('<codex-mem-context>')) {
              filesToProcess.push(fullPath);
            }
          } catch {
            // Skip files we can't read
          }
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  walkForAgentsMd(workingDir);

  if (filesToProcess.length === 0) {
    console.log('No AGENTS.md files with auto-generated content found.');
    return;
  }

  console.log(`Found ${filesToProcess.length} AGENTS.md files with auto-generated content:\n`);

  let deletedCount = 0;
  let cleanedCount = 0;
  let errorCount = 0;

  for (const file of filesToProcess) {
    const relativePath = path.relative(workingDir, file);

    try {
      const content = readFileSync(file, 'utf-8');

      // Strip the codex-mem-context tagged section
      const stripped = content.replace(/<codex-mem-context>[\s\S]*?<\/codex-mem-context>/g, '').trim();

      if (stripped === '') {
        // Empty after stripping → delete
        if (dryRun) {
          console.log(`  [DRY-RUN] Would delete (empty): ${relativePath}`);
        } else {
          unlinkSync(file);
          console.log(`  Deleted (empty): ${relativePath}`);
        }
        deletedCount++;
      } else {
        // Has content → write stripped version
        if (dryRun) {
          console.log(`  [DRY-RUN] Would clean: ${relativePath}`);
        } else {
          writeFileSync(file, stripped);
          console.log(`  Cleaned: ${relativePath}`);
        }
        cleanedCount++;
      }
    } catch (error) {
      console.error(`  Error processing ${relativePath}: ${error}`);
      errorCount++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Deleted (empty): ${deletedCount}`);
  console.log(`Cleaned:         ${cleanedCount}`);
  console.log(`Errors:          ${errorCount}`);

  if (dryRun) {
    console.log('\nRun without --dry-run to actually process files.');
  }
}

/**
 * Regenerate AGENTS.md for a single folder
 * @param absoluteFolder - Absolute path for writing files
 * @param relativeFolder - Relative path for DB queries (matches storage format)
 */
function regenerateFolder(
  db: Database,
  absoluteFolder: string,
  relativeFolder: string,
  project: string,
  dryRun: boolean
): { success: boolean; observationCount: number; error?: string } {
  try {
    // Query using relative path (matches DB storage format)
    const observations = findObservationsByFolder(db, relativeFolder, project, OBSERVATION_LIMIT);

    if (observations.length === 0) {
      return { success: false, observationCount: 0, error: 'No observations for folder' };
    }

    if (dryRun) {
      return { success: true, observationCount: observations.length };
    }

    // Format using relative path for display, write to absolute path
    const formatted = formatObservationsForAgentsMd(observations, relativeFolder);
    writeAgentsMdToFolderForRegenerate(absoluteFolder, formatted);

    return { success: true, observationCount: observations.length };
  } catch (error) {
    return { success: false, observationCount: 0, error: String(error) };
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const cleanMode = args.includes('--clean');

  const workingDir = process.cwd();

  // Handle cleanup mode
  if (cleanMode) {
    cleanupAutoGeneratedFiles(workingDir, dryRun);
    return;
  }

  console.log('=== AGENTS.md Regeneration Script ===\n');
  console.log(`Working directory: ${workingDir}`);

  // Determine project identifier (matches how hooks determine project - uses folder name)
  const project = path.basename(workingDir);
  console.log(`Project: ${project}\n`);

  // Get tracked folders using git ls-files
  console.log('Discovering folders (using git ls-files to respect .gitignore)...');
  const trackedFolders = getTrackedFolders(workingDir);

  if (trackedFolders.size === 0) {
    console.log('No folders found in project.');
    process.exit(0);
  }

  console.log(`Found ${trackedFolders.size} folders in project.\n`);

  // Open database
  if (!existsSync(DB_PATH)) {
    console.log('Database not found. No observations to process.');
    process.exit(0);
  }

  console.log('Opening database...');
  const db = new Database(DB_PATH, { readonly: true, create: false });

  if (dryRun) {
    console.log('[DRY RUN] Would regenerate the following folders:\n');
  }

  // Process each folder
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  const foldersArray = Array.from(trackedFolders).sort();

  for (let i = 0; i < foldersArray.length; i++) {
    const absoluteFolder = foldersArray[i];
    const progress = `[${i + 1}/${foldersArray.length}]`;
    const relativeFolder = path.relative(workingDir, absoluteFolder);

    if (dryRun) {
      // Query using relative path (matches DB storage format)
      const observations = findObservationsByFolder(db, relativeFolder, project, OBSERVATION_LIMIT);
      if (observations.length > 0) {
        console.log(`${progress} ${relativeFolder} (${observations.length} obs)`);
        successCount++;
      } else {
        skipCount++;
      }
      continue;
    }

    const result = regenerateFolder(db, absoluteFolder, relativeFolder, project, dryRun);

    if (result.success) {
      console.log(`${progress} ${relativeFolder} - ${result.observationCount} obs`);
      successCount++;
    } else if (result.error?.includes('No observations')) {
      skipCount++;
    } else {
      console.log(`${progress} ${relativeFolder} - ERROR: ${result.error}`);
      errorCount++;
    }
  }

  db.close();

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total folders scanned: ${foldersArray.length}`);
  console.log(`With observations:     ${successCount}`);
  console.log(`No observations:       ${skipCount}`);
  console.log(`Errors:                ${errorCount}`);

  if (dryRun) {
    console.log('\nRun without --dry-run to actually regenerate files.');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
