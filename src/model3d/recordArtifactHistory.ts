import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ModelAssetInput, ModelAssetProviderName } from '../model/CharacterBook.js';

export type RecordArtifactHistoryOptions = {
  characterDir: string;
  commit: string;
  summary: string;
  provider: ModelAssetProviderName;
  input: ModelAssetInput;
  primaryStl: string;
  date?: string;
};

const historyPath = 'generated/history.md';

export async function recordArtifactHistory(options: RecordArtifactHistoryOptions): Promise<string> {
  await mkdir(join(options.characterDir, 'generated'), { recursive: true });
  const path = join(options.characterDir, historyPath);
  const existing = await readExisting(path);
  const header = existing || '# Generated Artifact History\n\n';
  const date = options.date ?? new Date().toISOString().slice(0, 10);
  const entry = [
    `## ${date} - ${options.commit}`,
    '',
    `- Summary: ${options.summary}`,
    `- Provider: ${options.provider}`,
    `- Input: ${options.input}`,
    `- Primary STL: ${options.primaryStl}`,
    ''
  ].join('\n');

  await writeFile(path, `${header.trimEnd()}\n\n${entry}`);
  return path;
}

async function readExisting(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return '';
  }
}
