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

test('builds a static site with rendered pages and downloadable Homebrewery source', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'nice-character-site-'));

  await buildSite({
    outDir,
    renderHomebreweryHtml: async ({ markdown }) => `<div class="homebrewery-rendered">${markdown}</div>`,
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

  expect(index).toContain('Aria Thorn');
  expect(nojekyll).toBe('');
  expect(page).toContain('Print Character Book');
  expect(page).toContain('Download Homebrewery Source');
  expect(page).toContain('class="homebrewery-rendered"');
  expect(page).toContain('\\column');
  expect(page).not.toContain('class="column-break"');
  expect(source).toContain('{{classTable,frame');
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
