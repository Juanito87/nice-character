import mammoth from 'mammoth';
import { join } from 'node:path';
import { readCharacterDocx } from '../src/docx/readCharacterDocx.js';
import { renderHomebreweryMarkdown } from '../src/homebrewery/renderHomebreweryMarkdown.js';

const templatePath = join(process.cwd(), "docs/Template pj's.docx");

test('template docx follows the Escama Roja reusable structure', async () => {
  const { value: html } = await mammoth.convertToHtml({ path: templatePath });
  const book = await readCharacterDocx(templatePath);
  const markdown = renderHomebreweryMarkdown(book);

  expect(html).toContain('Character description');
  expect(html).toContain('LV 1 stats');
  expect(html).toContain('Flavor items');
  expect(html).toContain('AI Assets');
  expect(html).toContain('3D Assets');
  expect(html).toContain('Sources');
  expect(book.overviewRows.map((row) => row[0])).toEqual([
    'Name',
    'Pronouns',
    'Ancestry/Species',
    'Class/Multiclass',
    'Subclass',
    'Background',
    'Player',
    'Tagline',
    'Hit dice / HP',
    'Armor',
    'Weapons',
    'Tools',
    'Saving throws',
    'Skills'
  ]);
  expect(book.overview.description).toContain('Description paragraph');
  expect(book.levelOneStatsRows).toHaveLength(7);
  expect(book.progression).toHaveLength(20);
  expect(book.sectionBlocks.equipmentAndInventory).toEqual(
    expect.arrayContaining([
      { type: 'subtitle', title: 'Starting gear' },
      { type: 'subtitle', title: 'Wanted items' },
      { type: 'subtitle', title: 'Flavor items' },
      { type: 'subtitle', title: 'Utility items' }
    ])
  );
  expect(book.sectionBlocks.sources.length).toBeGreaterThan(0);
  expect(book.aiAssets).toEqual({ runAi: false, provider: 'mock', force: false });
  expect(book.modelAssets).toEqual({
    stl: undefined,
    run3d: false,
    provider: 'mock',
    input: 'text',
    force: false
  });
  expect(markdown).toContain('## Character Description');
  expect(markdown).toContain('## LV 1 Stats');
  expect(markdown).toContain('### Flavor items');
});
