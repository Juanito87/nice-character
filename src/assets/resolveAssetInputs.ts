import { readFile } from 'node:fs/promises';
import { isAbsolute, join, normalize, relative, resolve } from 'node:path';
import type { AssetInputs } from '../model/CharacterBook.js';

export async function resolveAssetInputs(characterDir: string, inputs: AssetInputs): Promise<Required<AssetInputs>> {
  return {
    summary: await resolveInput(characterDir, inputs.summary),
    imagePrompt: await resolveInput(characterDir, inputs.imagePrompt),
    stlPrompt: await resolveInput(characterDir, inputs.stlPrompt)
  };
}

async function resolveInput(characterDir: string, value?: string): Promise<string> {
  if (!value) {
    return '';
  }

  if (looksLikePath(value)) {
    const filePath = resolveWithinCharacterDir(characterDir, value);
    return (await readFile(filePath, 'utf8')).trim();
  }

  return value.trim();
}

function looksLikePath(value: string): boolean {
  return value.includes('/') || value.endsWith('.md') || value.endsWith('.txt');
}

function resolveWithinCharacterDir(characterDir: string, value: string): string {
  if (isAbsolute(value)) {
    throw new Error(`Asset input paths must be relative to the character folder: ${value}`);
  }

  const root = resolve(characterDir);
  const target = resolve(root, normalize(value));
  if (relative(root, target).startsWith('..')) {
    throw new Error(`Asset input path escapes the character folder: ${value}`);
  }
  return join(target);
}
