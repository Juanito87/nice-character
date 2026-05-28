#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { Command } from 'commander';
import { readCharacterDocx } from '../docx/readCharacterDocx.js';
import { renderHomebreweryMarkdown } from '../homebrewery/renderHomebreweryMarkdown.js';
import { discoverCharacters } from '../filesystem/discoverCharacters.js';
import { buildSite } from '../site/buildSite.js';
import { readRendererConfig, renderWithDocker } from '../homebrewery/renderWithDocker.js';

const program = new Command();

program
  .name('nice-character')
  .description('Convert structured D&D character DOCX books to Homebrewery v3 markdown and a static site.')
  .version('0.1.0');

program
  .command('validate')
  .argument('<path>', 'character folder or character.docx path')
  .action(async (input: string) => {
    await readCharacterDocx(resolveDocxPath(input));
    console.log('OK');
  });

program
  .command('convert')
  .argument('<characterDir>', 'character folder containing character.docx')
  .requiredOption('--out <dir>', 'output directory')
  .action(async (characterDir: string, options: { out: string }) => {
    const docxPath = resolveDocxPath(characterDir);
    const book = await readCharacterDocx(docxPath);
    const slug = slugFromCharacterDir(characterDir);
    const markdown = renderHomebreweryMarkdown(book);
    await mkdir(options.out, { recursive: true });
    await writeFile(join(options.out, `${slug}.brew.md`), markdown);
    await writeFile(join(options.out, 'assets.json'), JSON.stringify({ slug, assetInputs: book.assetInputs }, null, 2));
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
      const book = await readCharacterDocx(character.docxPath);
      rendered.push({
        slug: character.slug,
        title: book.overview.name,
        markdown: renderHomebreweryMarkdown(book)
      });
    }
    await buildSite({
      outDir: options.out,
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

function resolveDocxPath(input: string): string {
  const path = resolve(input);
  return path.endsWith('.docx') ? path : join(path, 'character.docx');
}

function slugFromCharacterDir(characterDir: string): string {
  return basename(resolve(characterDir)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
