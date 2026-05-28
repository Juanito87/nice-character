import { access, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

export type CharacterDirectory = {
  name: string;
  slug: string;
  dir: string;
  docxPath: string;
  localAssetsDir: string;
  manualDir: string;
  globalAssetsDir: string;
};

export async function discoverCharacters(charactersDir: string, globalAssetsDir: string): Promise<CharacterDirectory[]> {
  const entries = await readdir(charactersDir, { withFileTypes: true });
  const characters: CharacterDirectory[] = [];

  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const dir = join(charactersDir, entry.name);
    const docxPath = join(dir, 'character.docx');
    if (await exists(docxPath)) {
      characters.push({
        name: entry.name,
        slug: slugify(entry.name),
        dir,
        docxPath,
        localAssetsDir: join(dir, 'assets'),
        manualDir: join(dir, 'manual'),
        globalAssetsDir
      });
    }
  }

  return characters;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
