import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { AssetProvider } from './AssetProvider.js';
import type { CharacterBook } from '../model/CharacterBook.js';

export type PrepareCharacterAiAssetsOptions = {
  characterDir: string;
  docxPath: string;
  character: CharacterBook;
  provider: AssetProvider & { name?: string };
  force?: boolean;
};

export type PrepareCharacterAiAssetsResult = {
  generatedDir: string;
  created: string[];
  skipped: string[];
};

const descriptionPath = 'generated/description.md';
const imagePromptPath = 'generated/image-prompt.md';
const illustrationPath = 'generated/illustration.png';
const manifestPath = 'generated/assets.json';

export async function prepareCharacterAiAssets(options: PrepareCharacterAiAssetsOptions): Promise<PrepareCharacterAiAssetsResult> {
  const generatedDir = join(options.characterDir, 'generated');
  const created: string[] = [];
  const skipped: string[] = [];
  await mkdir(generatedDir, { recursive: true });

  if (!options.character.overview.description || options.force) {
    await writeSidecar({
      path: join(options.characterDir, descriptionPath),
      relativePath: descriptionPath,
      content: `${await options.provider.generateDescription(options.character)}\n`,
      force: options.force,
      created,
      skipped
    });
  } else {
    skipped.push(descriptionPath);
  }

  if (!options.character.overview.illustration || options.force) {
    const imagePrompt = await options.provider.generateImagePrompt(options.character);
    await writeSidecar({
      path: join(options.characterDir, imagePromptPath),
      relativePath: imagePromptPath,
      content: `${imagePrompt}\n`,
      force: options.force,
      created,
      skipped
    });
    await writeSidecar({
      path: join(options.characterDir, illustrationPath),
      relativePath: illustrationPath,
      content: await options.provider.generateIllustration(options.character, imagePrompt),
      force: options.force,
      created,
      skipped
    });
  } else {
    skipped.push(imagePromptPath, illustrationPath);
  }

  await writeFile(join(options.characterDir, manifestPath), `${JSON.stringify({
    provider: options.provider.name ?? 'unknown',
    generatedAt: new Date().toISOString(),
    sourceDocx: relative(options.characterDir, options.docxPath),
    created: [...created, manifestPath],
    skipped
  }, null, 2)}\n`);
  created.push(manifestPath);

  return { generatedDir, created, skipped };
}

export async function applyGeneratedAssets(character: CharacterBook, characterDir: string): Promise<CharacterBook> {
  const [description, hasIllustration] = await Promise.all([
    readOptionalText(join(characterDir, descriptionPath)),
    exists(join(characterDir, illustrationPath))
  ]);

  return {
    ...character,
    overview: {
      ...character.overview,
      description: character.overview.description ?? description,
      illustration: character.overview.illustration ?? (hasIllustration ? illustrationPath : undefined)
    }
  };
}

async function writeSidecar(options: {
  path: string;
  relativePath: string;
  content: string | Buffer;
  force?: boolean;
  created: string[];
  skipped: string[];
}): Promise<void> {
  if (!options.force && await exists(options.path)) {
    options.skipped.push(options.relativePath);
    return;
  }

  await writeFile(options.path, options.content);
  options.created.push(options.relativePath);
}

async function readOptionalText(path: string): Promise<string | undefined> {
  try {
    const text = (await readFile(path, 'utf8')).trim();
    return text || undefined;
  } catch {
    return undefined;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
