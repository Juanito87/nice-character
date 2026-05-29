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
    const docxPath = await findCharacterDocx(dir);
    if (docxPath) {
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

async function findCharacterDocx(dir: string): Promise<string | undefined> {
  const canonical = join(dir, 'character.docx');
  if (await exists(canonical)) {
    return canonical;
  }

  const docxFiles = (await readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase().endsWith('.docx'))
    .filter((name) => !name.startsWith('.') && !name.startsWith('~') && !name.startsWith('.~lock'))
    .sort((a, b) => a.localeCompare(b));

  return docxFiles.length === 1 ? join(dir, docxFiles[0] ?? '') : undefined;
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
