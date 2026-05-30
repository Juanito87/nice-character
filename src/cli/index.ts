#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { Command } from 'commander';
import { readCharacterDocx } from '../docx/readCharacterDocx.js';
import { renderHomebreweryMarkdown } from '../homebrewery/renderHomebreweryMarkdown.js';
import { discoverCharacters, findCharacterDocx } from '../filesystem/discoverCharacters.js';
import { buildSite } from '../site/buildSite.js';
import { readRendererConfig, renderWithDocker } from '../homebrewery/renderWithDocker.js';
import { applyGeneratedAssets, prepareCharacterAiAssets } from '../ai/prepareCharacterAiAssets.js';
import { createAssetProvider } from '../ai/createAssetProvider.js';
import { resolveModelAssets } from '../assets/resolveModelAssets.js';
import { createModelProvider } from '../model3d/createModelProvider.js';
import { prepareCharacter3dAssets } from '../model3d/prepareCharacter3dAssets.js';
import { recordArtifactHistory } from '../model3d/recordArtifactHistory.js';
import type { AiAssetProviderName, ModelAssetInput, ModelAssetProviderName } from '../model/CharacterBook.js';

const program = new Command();

program
  .name('nice-character')
  .description('Convert structured D&D character DOCX books to Homebrewery v3 markdown and a static site.')
  .version('0.1.0');

program
  .command('validate')
  .argument('<path>', 'character folder or character.docx path')
  .action(async (input: string) => {
    await readCharacterDocx(await resolveDocxPath(input));
    console.log('OK');
  });

program
  .command('convert')
  .argument('<characterDir>', 'character folder containing character.docx')
  .requiredOption('--out <dir>', 'output directory')
  .action(async (characterDir: string, options: { out: string }) => {
    const docxPath = await resolveDocxPath(characterDir);
    const book = await applyGeneratedAssets(await readCharacterDocx(docxPath), resolve(characterDir));
    const slug = slugFromCharacterDir(characterDir);
    const markdown = renderHomebreweryMarkdown(book);
    await mkdir(options.out, { recursive: true });
    await writeFile(join(options.out, `${slug}.brew.md`), markdown);
    await writeFile(join(options.out, 'assets.json'), JSON.stringify({ slug, assetInputs: book.assetInputs }, null, 2));
  });

program
  .command('prepare-ai')
  .argument('<path>', 'character folder or character.docx path')
  .option('--provider <provider>', 'AI provider: mock, openai, or gemini')
  .option('--force', 'overwrite existing generated sidecars', false)
  .option('--run-ai', 'run even when the DOCX AI Assets section does not opt in', false)
  .action(async (input: string, options: { provider?: string; force: boolean; runAi: boolean }) => {
    const inputPath = resolve(input);
    const discovered = await findCharacterDocx(inputPath);
    if (!input.endsWith('.docx') && !discovered) {
      const characters = await discoverCharacters(inputPath, 'assets');
      const results = [];
      for (const characterDir of characters) {
        const character = await readCharacterDocx(characterDir.docxPath);
        if (!options.runAi && character.aiAssets?.runAi !== true) {
          results.push({ character: characterDir.name, skipped: 'AI Assets run_ai is not true' });
          continue;
        }
        const providerName = providerNameFrom(options.provider ?? character.aiAssets?.provider ?? 'mock');
        const result = await prepareCharacterAiAssets({
          characterDir: characterDir.dir,
          docxPath: characterDir.docxPath,
          character,
          provider: createAssetProvider({ provider: providerName }),
          force: options.force || character.aiAssets?.force === true
        });
        results.push({ character: characterDir.name, ...result });
      }
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    const docxPath = await resolveDocxPath(input);
    const characterDir = input.endsWith('.docx') ? dirname(resolve(input)) : inputPath;
    const character = await readCharacterDocx(docxPath);
    if (!options.runAi && character.aiAssets?.runAi === false) {
      console.log(JSON.stringify({ skipped: 'AI Assets run_ai is false' }, null, 2));
      return;
    }
    const providerName = providerNameFrom(options.provider ?? character.aiAssets?.provider ?? 'mock');
    const result = await prepareCharacterAiAssets({
      characterDir,
      docxPath,
      character,
      provider: createAssetProvider({ provider: providerName }),
      force: options.force || character.aiAssets?.force === true
    });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('prepare-3d')
  .argument('<path>', 'character folder, character.docx path, or characters root')
  .option('--provider <provider>', '3D provider: mock, meshy, or tripo')
  .option('--input <input>', '3D input: text or image')
  .option('--force', 'overwrite current generated 3D outputs', false)
  .option('--run-3d', 'run even when the DOCX 3D Assets section does not opt in', false)
  .action(async (input: string, options: { provider?: string; input?: string; force: boolean; run3d: boolean }) => {
    const inputPath = resolve(input);
    const discovered = await findCharacterDocx(inputPath);
    if (!input.endsWith('.docx') && !discovered) {
      const characters = await discoverCharacters(inputPath, 'assets');
      const results = [];
      for (const characterDir of characters) {
        const character = await readCharacterDocx(characterDir.docxPath);
        if (!options.run3d && character.modelAssets?.run3d !== true) {
          results.push({ character: characterDir.name, skipped: '3D Assets run_3d is not true' });
          continue;
        }
        const providerName = modelProviderNameFrom(options.provider ?? character.modelAssets?.provider ?? 'mock');
        const inputMode = modelInputFrom(options.input ?? character.modelAssets?.input ?? 'text');
        const result = await prepareCharacter3dAssets({
          characterDir: characterDir.dir,
          docxPath: characterDir.docxPath,
          character,
          provider: createModelProvider({ provider: providerName }),
          input: inputMode,
          force: options.force || character.modelAssets?.force === true
        });
        results.push({ character: characterDir.name, ...result });
      }
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    const docxPath = await resolveDocxPath(input);
    const characterDir = input.endsWith('.docx') ? dirname(resolve(input)) : inputPath;
    const character = await readCharacterDocx(docxPath);
    if (!options.run3d && character.modelAssets?.run3d === false) {
      console.log(JSON.stringify({ skipped: '3D Assets run_3d is false' }, null, 2));
      return;
    }
    const providerName = modelProviderNameFrom(options.provider ?? character.modelAssets?.provider ?? 'mock');
    const inputMode = modelInputFrom(options.input ?? character.modelAssets?.input ?? 'text');
    const result = await prepareCharacter3dAssets({
      characterDir,
      docxPath,
      character,
      provider: createModelProvider({ provider: providerName }),
      input: inputMode,
      force: options.force || character.modelAssets?.force === true
    });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('record-artifact-history')
  .argument('<characterDir>', 'character folder')
  .requiredOption('--commit <sha>', 'commit SHA containing the artifact change')
  .requiredOption('--summary <text>', 'short history summary')
  .option('--provider <provider>', '3D provider: mock, meshy, or tripo', 'mock')
  .option('--input <input>', '3D input: text or image', 'text')
  .option('--stl <path>', 'primary STL path', 'generated/3d/current/model.stl')
  .action(async (characterDir: string, options: { commit: string; summary: string; provider: string; input: string; stl: string }) => {
    const path = await recordArtifactHistory({
      characterDir: resolve(characterDir),
      commit: options.commit,
      summary: options.summary,
      provider: modelProviderNameFrom(options.provider),
      input: modelInputFrom(options.input),
      primaryStl: options.stl
    });
    console.log(JSON.stringify({ history: path }, null, 2));
  });

program
  .command('build-site')
  .option('--input <dir>', 'characters directory', 'characters')
  .option('--out <dir>', 'output directory', 'dist')
  .action(async (options: { input: string; out: string }) => {
    const rendererConfig = await readRendererConfig();
    const characters = await discoverCharacters(options.input, 'assets');
    const rendered = [];
    for (const character of characters) {
      const book = await applyGeneratedAssets(await readCharacterDocx(character.docxPath), character.dir);
      const stlDownload = await resolveStlDownload(character.dir, book.modelAssets);
      rendered.push({
        slug: character.slug,
        title: book.overview.name,
        markdown: renderHomebreweryMarkdown(book),
        generatedAssetsDir: character.dir,
        stlDownload
      });
    }
    await buildSite({
      outDir: options.out,
      homebreweryAssetsDir: join('.homebrewery-src', rendererConfig.homebreweryCommit, 'themes/assets'),
      homebreweryFontsDir: join('.homebrewery-src', rendererConfig.homebreweryCommit, 'themes/fonts'),
      characters: rendered,
      renderHomebreweryHtml: async (character) => {
        const characterOut = join(options.out, character.slug);
        const inputPath = join(characterOut, `${character.slug}.brew.md`);
        const outputPath = join(characterOut, `${character.slug}.homebrewery.html`);
        await mkdir(characterOut, { recursive: true });
        await writeFile(inputPath, character.markdown);
        await renderWithDocker(inputPath, outputPath, rendererConfig);
        return readFile(outputPath, 'utf8');
      }
    });
  });

program
  .command('render-homebrewery')
  .argument('<input>', 'input .brew.md file')
  .argument('<output>', 'output rendered HTML file')
  .action(async (input: string, output: string) => {
    const rendererConfig = await readRendererConfig();
    await renderWithDocker(resolve(input), resolve(output), rendererConfig);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function resolveDocxPath(input: string): Promise<string> {
  const path = resolve(input);
  if (path.endsWith('.docx')) {
    return path;
  }

  return await findCharacterDocx(path) ?? join(path, 'character.docx');
}

function slugFromCharacterDir(characterDir: string): string {
  return basename(resolve(characterDir)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function providerNameFrom(value: string): AiAssetProviderName {
  if (value === 'mock' || value === 'openai' || value === 'gemini') {
    return value;
  }
  throw new Error(`Unsupported AI provider: ${value}`);
}

function modelProviderNameFrom(value: string): ModelAssetProviderName {
  if (value === 'mock' || value === 'meshy' || value === 'tripo') {
    return value;
  }
  throw new Error(`Unsupported 3D provider: ${value}`);
}

function modelInputFrom(value: string): ModelAssetInput {
  if (value === 'text' || value === 'image') {
    return value;
  }
  throw new Error(`Unsupported 3D input: ${value}`);
}

async function resolveStlDownload(characterDir: string, modelAssets: Awaited<ReturnType<typeof readCharacterDocx>>['modelAssets']): Promise<{ href: string; label: string; copyFrom?: string } | undefined> {
  const manual = await resolveModelAssets(characterDir, modelAssets);
  if (manual.stl) {
    return {
      href: manual.stl.href,
      label: 'Download STL',
      copyFrom: manual.stl.copyFrom
    };
  }

  try {
    const manifest = JSON.parse(await readFile(join(characterDir, 'generated/3d/current.json'), 'utf8')) as { primaryStl?: string };
    return manifest.primaryStl
      ? { href: manifest.primaryStl, label: 'Download STL' }
      : undefined;
  } catch {
    return undefined;
  }
}
