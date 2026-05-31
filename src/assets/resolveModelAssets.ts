import { access } from 'node:fs/promises';
import { isAbsolute, normalize, relative, resolve } from 'node:path';
import type { ModelAssets } from '../model/CharacterBook.js';

export type ResolvedModelStl = {
  kind: 'local' | 'external';
  source: string;
  href: string;
  copyFrom?: string;
};

export type ResolvedModelAssets = {
  stl?: ResolvedModelStl;
};

export async function resolveModelAssets(characterDir: string, assets?: ModelAssets): Promise<ResolvedModelAssets> {
  if (!assets?.stl) {
    return {};
  }

  if (isExternalUrl(assets.stl)) {
    return {
      stl: {
        kind: 'external',
        source: assets.stl,
        href: assets.stl
      }
    };
  }

  const copyFrom = resolveWithinCharacterDir(characterDir, assets.stl);
  await access(copyFrom);
  return {
    stl: {
      kind: 'local',
      source: assets.stl,
      href: normalizeHref(assets.stl),
      copyFrom
    }
  };
}

function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function resolveWithinCharacterDir(characterDir: string, value: string): string {
  if (isAbsolute(value)) {
    throw new Error(`Model asset paths must be relative to the character folder: ${value}`);
  }

  const root = resolve(characterDir);
  const target = resolve(root, normalize(value));
  if (relative(root, target).startsWith('..')) {
    throw new Error(`Model asset path escapes the character folder: ${value}`);
  }
  return target;
}

function normalizeHref(value: string): string {
  return normalize(value).replaceAll('\\', '/');
}
