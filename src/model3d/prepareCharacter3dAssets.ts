import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { resolveAssetInputs } from '../assets/resolveAssetInputs.js';
import type { CharacterBook, ModelAssetInput } from '../model/CharacterBook.js';
import type { ModelProvider } from './ModelProvider.js';

export type PrepareCharacter3dAssetsOptions = {
  characterDir: string;
  docxPath: string;
  character: CharacterBook;
  provider: ModelProvider;
  input: ModelAssetInput;
  force?: boolean;
};

export type PrepareCharacter3dAssetsResult = {
  currentDir: string;
  created: string[];
  skipped: string[];
};

const promptPath = 'generated/stl-prompt.md';
const currentDirPath = 'generated/3d/current';
const currentManifestPath = 'generated/3d/current.json';

export async function prepareCharacter3dAssets(options: PrepareCharacter3dAssetsOptions): Promise<PrepareCharacter3dAssetsResult> {
  const created: string[] = [];
  const skipped: string[] = [];
  const currentDir = join(options.characterDir, currentDirPath);
  const manifestPath = join(options.characterDir, currentManifestPath);

  if (!options.force && await fileExists(manifestPath)) {
    return { currentDir, created, skipped: [currentDirPath, currentManifestPath] };
  }

  await mkdir(join(options.characterDir, 'generated'), { recursive: true });
  const prompt = await stlPromptFor(options.characterDir, options.character);
  await writeFile(join(options.characterDir, promptPath), `${prompt}\n`);
  created.push(promptPath);

  await rm(currentDir, { recursive: true, force: true });
  await mkdir(currentDir, { recursive: true });

  const generated = await options.provider.generateModel({
    character: options.character,
    prompt,
    input: options.input,
    imageUrl: await imageInputUrl(options.characterDir, options.character, options.input)
  });

  for (const file of generated.files) {
    const relativePath = `${currentDirPath}/${file.name}`;
    await writeFile(join(options.characterDir, relativePath), file.content);
    created.push(relativePath);
  }

  const primaryStl = generated.primaryStlName ? `${currentDirPath}/${generated.primaryStlName}` : undefined;
  await writeFile(manifestPath, `${JSON.stringify({
    provider: generated.provider,
    input: generated.input,
    sourceDocx: relative(options.characterDir, options.docxPath),
    prompt: promptPath,
    primaryStl,
    taskIds: generated.taskIds,
    consumedCredits: generated.consumedCredits,
    outputs: generated.files.map((file) => ({
      path: `${currentDirPath}/${file.name}`,
      sourceUrl: file.sourceUrl
    })),
    metadata: generated.metadata
  }, null, 2)}\n`);
  created.push(currentManifestPath);

  return { currentDir, created, skipped };
}

async function imageInputUrl(characterDir: string, character: CharacterBook, input: ModelAssetInput): Promise<string | undefined> {
  if (input !== 'image') {
    return undefined;
  }
  const illustration = character.overview.illustration;
  if (!illustration) {
    throw new Error('Image-to-3D generation requires a character illustration');
  }
  if (/^(https?:\/\/|data:)/i.test(illustration)) {
    return illustration;
  }

  const root = resolve(characterDir);
  const path = resolve(root, illustration);
  if (relative(root, path).startsWith('..')) {
    throw new Error(`Illustration path escapes the character folder: ${illustration}`);
  }
  const content = await readFile(path);
  return `data:${mimeType(path)};base64,${content.toString('base64')}`;
}

function mimeType(path: string): string {
  const ext = extname(path).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') {
    return 'image/jpeg';
  }
  if (ext === '.webp') {
    return 'image/webp';
  }
  return 'image/png';
}

async function stlPromptFor(characterDir: string, character: CharacterBook): Promise<string> {
  const resolved = await resolveAssetInputs(characterDir, character.assetInputs);
  return resolved.stlPrompt || `Tabletop miniature STL brief for ${character.overview.name}.`;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

export function generatedModelManifestPath(characterDir: string): string {
  return join(characterDir, currentManifestPath);
}

export function generatedModelCurrentDir(characterDir: string): string {
  return join(characterDir, currentDirPath);
}
