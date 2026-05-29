import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp } from 'node:fs/promises';
import { discoverCharacters } from '../src/filesystem/discoverCharacters.js';
import { buildSite } from '../src/site/buildSite.js';
import { resolveAssetInputs } from '../src/assets/resolveAssetInputs.js';

test('discovers character folders with character-local manual files and global assets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nice-character-'));
  const characterDir = join(root, 'characters/aria-thorn');
  await mkdir(join(characterDir, 'manual'), { recursive: true });
  await mkdir(join(characterDir, 'assets'), { recursive: true });
  await mkdir(join(root, 'assets'), { recursive: true });
  await writeFile(join(characterDir, 'character.docx'), 'placeholder');
  await writeFile(join(characterDir, 'manual/summary.md'), 'Manual summary');
  await writeFile(join(root, 'assets/global.css'), '.page {}');

  const characters = await discoverCharacters(join(root, 'characters'), join(root, 'assets'));

  expect(characters).toEqual([
    {
      name: 'aria-thorn',
      slug: 'aria-thorn',
      dir: characterDir,
      docxPath: join(characterDir, 'character.docx'),
      localAssetsDir: join(characterDir, 'assets'),
      manualDir: join(characterDir, 'manual'),
      globalAssetsDir: join(root, 'assets')
    }
  ]);
});

test('discovers a character folder with a single folder-named DOCX', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nice-character-'));
  const characterDir = join(root, 'characters/Escama Roja');
  await mkdir(characterDir, { recursive: true });
  await writeFile(join(characterDir, 'EscamaRoja.docx'), 'placeholder');
  await writeFile(join(characterDir, '.~lock.EscamaRoja.docx#'), 'lock');

  const characters = await discoverCharacters(join(root, 'characters'), join(root, 'assets'));

  expect(characters).toMatchObject([
    {
      name: 'Escama Roja',
      slug: 'escama-roja',
      docxPath: join(characterDir, 'EscamaRoja.docx')
    }
  ]);
});

test('builds a static site with rendered pages and downloadable Homebrewery source', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'nice-character-site-'));
  const assetsDir = join(outDir, 'homebrewery-assets-source');
  const fontsDir = join(outDir, 'homebrewery-fonts-source');
  await mkdir(assetsDir, { recursive: true });
  await mkdir(join(fontsDir, '5e'), { recursive: true });
  await writeFile(join(assetsDir, 'parchmentBackground.jpg'), 'image');
  await writeFile(join(fontsDir, '5e/BookInsanity.woff2'), 'font');

  await buildSite({
    outDir,
    homebreweryAssetsDir: assetsDir,
    homebreweryFontsDir: fontsDir,
    renderHomebreweryHtml: async ({ markdown }) => `
      <style>
        @font-face{font-family:BookInsanity;src:url('../../../fonts/5e/BookInsanity.woff2')}
        .page{background-image:url('/assets/parchmentBackground.jpg')}
      </style>
      <div class="brewRenderer rendererV3"><div class="pages"><div class="page">${markdown}</div></div></div>
    `,
    characters: [
      {
        slug: 'aria-thorn',
        title: 'Aria Thorn',
        markdown: '# Aria Thorn\n\n\\column\n\n{{classTable,frame\n| Level | Features |\n| 1 | Second Wind |\n}}\n\n{{footnote Character Overview}}\n{{pageNumber,auto}}\n\\page\n'
      }
    ]
  });

  const index = await readFile(join(outDir, 'index.html'), 'utf8');
  const nojekyll = await readFile(join(outDir, '.nojekyll'), 'utf8');
  const page = await readFile(join(outDir, 'aria-thorn/index.html'), 'utf8');
  const source = await readFile(join(outDir, 'aria-thorn/aria-thorn.brew.md'), 'utf8');
  const copiedAsset = await readFile(join(outDir, 'assets/parchmentBackground.jpg'), 'utf8');
  const copiedFont = await readFile(join(outDir, 'fonts/5e/BookInsanity.woff2'), 'utf8');

  expect(index).toContain('Aria Thorn');
  expect(nojekyll).toBe('');
  expect(page).toContain('Print Character Book');
  expect(page).toContain('Download Homebrewery Source');
  expect(page).toContain('class="brewRenderer rendererV3"');
  expect(page).toContain('class="pages"');
  expect(page).toContain("url('../assets/parchmentBackground.jpg')");
  expect(page).toContain("url('../fonts/5e/BookInsanity.woff2')");
  expect(page).toContain('\\column');
  expect(page).not.toContain('class="column-break"');
  expect(source).toContain('{{classTable,frame');
  expect(copiedAsset).toBe('image');
  expect(copiedFont).toBe('font');
});

test('resolves manual asset inputs relative to the character folder', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nice-character-assets-'));
  const characterDir = join(root, 'characters/aria-thorn');
  await mkdir(join(characterDir, 'manual'), { recursive: true });
  await writeFile(join(characterDir, 'manual/summary.md'), 'Aria is a banner-seeking duelist.');
  await writeFile(join(characterDir, 'manual/image-prompt.md'), 'Portrait prompt.');
  await writeFile(join(characterDir, 'manual/stl-prompt.md'), 'Miniature prompt.');

  const resolved = await resolveAssetInputs(characterDir, {
    summary: 'manual/summary.md',
    imagePrompt: 'manual/image-prompt.md',
    stlPrompt: 'manual/stl-prompt.md'
  });

  expect(resolved).toEqual({
    summary: 'Aria is a banner-seeking duelist.',
    imagePrompt: 'Portrait prompt.',
    stlPrompt: 'Miniature prompt.'
  });
});
