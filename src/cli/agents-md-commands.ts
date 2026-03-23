/**
 * AGENTS.md Generation and Cleanup Commands
 *
 * Shared module for AGENTS.md file management that can be invoked from:
 * - CLI: `codex-mem generate` / `codex-mem clean`
 * - Worker service API endpoints
 *
 * Provides two main operations:
 * - generateAgentsMd: Regenerate AGENTS.md files for folders with observations
 * - cleanAgentsMd: Remove auto-generated content from AGENTS.md files
 */

import { Database } from 'bun:sqlite';
import path from 'path';
import os from 'os';
import {
  existsSync,
  writeFileSync,
  readFileSync,
  renameSync,
  unlinkSync,
  readdirSync
} from 'fs';
import { execSync } from 'child_process';
import { SettingsDefaultsManager } from '../shared/SettingsDefaultsManager.js';
import { formatTime, groupByDate } from '../shared/timeline-formatting.js';
import { isDirectChild } from '../shared/path-utils.js';
import { logger } from '../utils/logger.js';

const DB_PATH = path.join(os.homedir(), '.Codex-mem', 'claude-mem.db');
const SETTINGS_PATH = path.join(os.homedir(), '.Codex-mem', 'settings.json');

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
 * Get tracked folders using git ls-files.
 * Respects .gitignore and only returns folders within the project.
 */
function getTrackedFolders(workingDir: string): Set<string> {
  const folders = new Set<string>();

  try {
    const output = execSync('git ls-files', {
      cwd: workingDir,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024
    });

    const files = output.trim().split('\n').filter(f => f);

    for (const file of files) {
      const absPath = path.join(workingDir, file);
      let dir = path.dirname(absPath);

      while (dir.length > workingDir.length && dir.startsWith(workingDir)) {
        folders.add(dir);
        dir = path.dirname(dir);
      }
    }
  } catch (error) {
    logger.warn('AGENTS_MD', 'git ls-files failed, falling back to directory walk', { error: String(error) });
    walkDirectoriesWithIgnore(workingDir, folders);
  }

  return folders;
}

/**
 * Fallback directory walker that skips common ignored patterns.
 */
function walkDirectoriesWithIgnore(dir: string, folders: Set<string>, depth: number = 0): void {
  if (depth > 10) return;

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
 * Check if an observation has any files that are direct children of the folder.
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
 * Query observations for a specific folder.
 * Only returns observations with files directly in the folder (not in subfolders).
 */
function findObservationsByFolder(db: Database, relativeFolderPath: string, project: string, limit: number): ObservationRow[] {
  const queryLimit = limit * 3;

  const sql = `
    SELECT o.*, o.discovery_tokens
    FROM observations o
    WHERE o.project = ?
      AND (o.files_modified LIKE ? OR o.files_read LIKE ?)
    ORDER BY o.created_at_epoch DESC
    LIMIT ?
  `;

  // Database stores paths with forward slashes (git-normalized)
  const normalizedFolderPath = relativeFolderPath.split(path.sep).join('/');
  const likePattern = `%"${normalizedFolderPath}/%`;
  const allMatches = db.prepare(sql).all(project, likePattern, likePattern, queryLimit) as ObservationRow[];

  return allMatches.filter(obs => hasDirectChildFile(obs, relativeFolderPath)).slice(0, limit);
}

/**
 * Extract relevant file from an observation for display.
 * Only returns files that are direct children of the folder.
 */
function extractRelevantFile(obs: ObservationRow, relativeFolder: string): string {
  if (obs.files_modified) {
    try {
      const modified = JSON.parse(obs.files_modified);
      if (Array.isArray(modified)) {
        for (const file of modified) {
          if (isDirectChild(file, relativeFolder)) {
            return path.basename(file);
          }
        }
      }
    } catch {}
  }

  if (obs.files_read) {
    try {
      const read = JSON.parse(obs.files_read);
      if (Array.isArray(read)) {
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
 * Format observations for AGENTS.md content.
 */
function formatObservationsForAgentsMd(observations: ObservationRow[], folderPath: string): string {
  const lines: string[] = [];
  lines.push('# Recent Activity');
  lines.push('');
  lines.push('<!-- This section is auto-generated by codex-mem. Edit content outside the tags. -->');
  lines.push('');

  if (observations.length === 0) {
    lines.push('*No recent activity*');
    return lines.join('\n');
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
 * Write AGENTS.md file with tagged content preservation.
 * Only writes to folders that exist — never creates directories.
 */
function writeAgentsMdToFolder(folderPath: string, newContent: string): void {
  const resolvedPath = path.resolve(folderPath);

  // Never write inside .git directories — corrupts refs (#1165)
  if (resolvedPath.includes('/.git/') || resolvedPath.includes('\\.git\\') || resolvedPath.endsWith('/.git') || resolvedPath.endsWith('\\.git')) return;

  const agentsMdPath = path.join(folderPath, 'AGENTS.md');
  const tempFile = `${agentsMdPath}.tmp`;

  if (!existsSync(folderPath)) {
    throw new Error(`Folder does not exist: ${folderPath}`);
  }

  let existingContent = '';
  if (existsSync(agentsMdPath)) {
    existingContent = readFileSync(agentsMdPath, 'utf-8');
  }

  const startTag = '<codex-mem-context>';
  const endTag = '</codex-mem-context>';

  let finalContent: string;
  if (!existingContent) {
    finalContent = `${startTag}\n${newContent}\n${endTag}`;
  } else {
    const startIdx = existingContent.indexOf(startTag);
    const endIdx = existingContent.indexOf(endTag);

    if (startIdx !== -1 && endIdx !== -1) {
      finalContent = existingContent.substring(0, startIdx) +
        `${startTag}\n${newContent}\n${endTag}` +
        existingContent.substring(endIdx + endTag.length);
    } else {
      finalContent = existingContent + `\n\n${startTag}\n${newContent}\n${endTag}`;
    }
  }

  writeFileSync(tempFile, finalContent);
  renameSync(tempFile, agentsMdPath);
}

/**
 * Regenerate AGENTS.md for a single folder.
 */
function regenerateFolder(
  db: Database,
  absoluteFolder: string,
  relativeFolder: string,
  project: string,
  dryRun: boolean,
  workingDir: string,
  observationLimit: number
): { success: boolean; observationCount: number; error?: string } {
  try {
    if (!existsSync(absoluteFolder)) {
      return { success: false, observationCount: 0, error: 'Folder no longer exists' };
    }

    // Validate folder is within project root (prevent path traversal)
    const resolvedFolder = path.resolve(absoluteFolder);
    const resolvedWorkingDir = path.resolve(workingDir);
    if (!resolvedFolder.startsWith(resolvedWorkingDir + path.sep)) {
      return { success: false, observationCount: 0, error: 'Path escapes project root' };
    }

    const observations = findObservationsByFolder(db, relativeFolder, project, observationLimit);

    if (observations.length === 0) {
      return { success: false, observationCount: 0, error: 'No observations for folder' };
    }

    if (dryRun) {
      return { success: true, observationCount: observations.length };
    }

    const formatted = formatObservationsForAgentsMd(observations, relativeFolder);
    writeAgentsMdToFolder(absoluteFolder, formatted);

    return { success: true, observationCount: observations.length };
  } catch (error) {
    return { success: false, observationCount: 0, error: String(error) };
  }
}

/**
 * Generate AGENTS.md files for all folders with observations.
 *
 * @param dryRun - If true, only report what would be done without writing files
 * @returns Exit code (0 for success, 1 for error)
 */
export async function generateAgentsMd(dryRun: boolean): Promise<number> {
  try {
    const workingDir = process.cwd();
    const settings = SettingsDefaultsManager.loadFromFile(SETTINGS_PATH);
    const observationLimit = parseInt(settings.CLAUDE_MEM_CONTEXT_OBSERVATIONS, 10) || 50;

    logger.info('AGENTS_MD', 'Starting AGENTS.md generation', {
      workingDir,
      dryRun,
      observationLimit
    });

    const project = path.basename(workingDir);
    const trackedFolders = getTrackedFolders(workingDir);

    if (trackedFolders.size === 0) {
      logger.info('AGENTS_MD', 'No folders found in project');
      return 0;
    }

    logger.info('AGENTS_MD', `Found ${trackedFolders.size} folders in project`);

    if (!existsSync(DB_PATH)) {
      logger.info('AGENTS_MD', 'Database not found, no observations to process');
      return 0;
    }

    const db = new Database(DB_PATH, { readonly: true, create: false });

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    const foldersArray = Array.from(trackedFolders).sort();

    for (const absoluteFolder of foldersArray) {
      const relativeFolder = path.relative(workingDir, absoluteFolder);

      const result = regenerateFolder(
        db,
        absoluteFolder,
        relativeFolder,
        project,
        dryRun,
        workingDir,
        observationLimit
      );

      if (result.success) {
        logger.debug('AGENTS_MD', `Processed folder: ${relativeFolder}`, {
          observationCount: result.observationCount
        });
        successCount++;
      } else if (result.error?.includes('No observations')) {
        skipCount++;
      } else {
        logger.warn('AGENTS_MD', `Error processing folder: ${relativeFolder}`, {
          error: result.error
        });
        errorCount++;
      }
    }

    db.close();

    logger.info('AGENTS_MD', 'AGENTS.md generation complete', {
      totalFolders: foldersArray.length,
      withObservations: successCount,
      noObservations: skipCount,
      errors: errorCount,
      dryRun
    });

    return 0;
  } catch (error) {
    logger.error('AGENTS_MD', 'Fatal error during AGENTS.md generation', {
      error: String(error)
    });
    return 1;
  }
}

/**
 * Clean up auto-generated AGENTS.md files.
 *
 * For each file with <codex-mem-context> tags:
 * - Strip the tagged section
 * - If empty after stripping, delete the file
 * - If has remaining content, save the stripped version
 *
 * @param dryRun - If true, only report what would be done without modifying files
 * @returns Exit code (0 for success, 1 for error)
 */
export async function cleanAgentsMd(dryRun: boolean): Promise<number> {
  try {
    const workingDir = process.cwd();

    logger.info('AGENTS_MD', 'Starting AGENTS.md cleanup', {
      workingDir,
      dryRun
    });

    const filesToProcess: string[] = [];

    function walkForAgentsMd(dir: string): void {
      const ignorePatterns = [
        'node_modules', '.git', '.next', 'dist', 'build', '.cache',
        '__pycache__', '.venv', 'venv', '.idea', '.vscode', 'coverage',
        '.Codex-mem', '.open-next', '.turbo'
      ];

      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            if (!ignorePatterns.includes(entry.name)) {
              walkForAgentsMd(fullPath);
            }
          } else if (entry.name === 'AGENTS.md') {
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
      logger.info('AGENTS_MD', 'No AGENTS.md files with auto-generated content found');
      return 0;
    }

    logger.info('AGENTS_MD', `Found ${filesToProcess.length} AGENTS.md files with auto-generated content`);

    let deletedCount = 0;
    let cleanedCount = 0;
    let errorCount = 0;

    for (const file of filesToProcess) {
      const relativePath = path.relative(workingDir, file);

      try {
        const content = readFileSync(file, 'utf-8');
        const stripped = content.replace(/<codex-mem-context>[\s\S]*?<\/codex-mem-context>/g, '').trim();

        if (stripped === '') {
          if (!dryRun) {
            unlinkSync(file);
          }
          logger.debug('AGENTS_MD', `${dryRun ? '[DRY-RUN] Would delete' : 'Deleted'} (empty): ${relativePath}`);
          deletedCount++;
        } else {
          if (!dryRun) {
            writeFileSync(file, stripped);
          }
          logger.debug('AGENTS_MD', `${dryRun ? '[DRY-RUN] Would clean' : 'Cleaned'}: ${relativePath}`);
          cleanedCount++;
        }
      } catch (error) {
        logger.warn('AGENTS_MD', `Error processing ${relativePath}`, { error: String(error) });
        errorCount++;
      }
    }

    logger.info('AGENTS_MD', 'AGENTS.md cleanup complete', {
      deleted: deletedCount,
      cleaned: cleanedCount,
      errors: errorCount,
      dryRun
    });

    return 0;
  } catch (error) {
    logger.error('AGENTS_MD', 'Fatal error during AGENTS.md cleanup', {
      error: String(error)
    });
    return 1;
  }
}
