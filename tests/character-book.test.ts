import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseCharacterHtml } from '../src/docx/parseCharacterHtml.js';
import { renderHomebreweryMarkdown } from '../src/homebrewery/renderHomebreweryMarkdown.js';

const fixturePath = join(process.cwd(), 'tests/fixtures/valid-character.html');

test('parses a structured level 1-20 character book without a current level', async () => {
  const html = await readFile(fixturePath, 'utf8');
  const book = parseCharacterHtml(html);

  expect(book.overview.name).toBe('Aria Thorn');
  expect(book.overview.level).toBeUndefined();
  expect(book.progression).toHaveLength(20);
  expect(book.progression.map((level) => level.level)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
  expect(book.features.some((feature) => feature.name === 'Action Surge')).toBe(true);
});

test('rejects documents that do not define all levels from 1 to 20', async () => {
  const html = (await readFile(fixturePath, 'utf8')).replace('<tr><td>20</td><td>+6</td><td>Extra Attack (3)</td><td></td><td></td><td></td><td></td></tr>', '');

  expect(() => parseCharacterHtml(html)).toThrow(/missing level 20/i);
});

test('rejects progression features that are missing full descriptions', async () => {
  const html = (await readFile(fixturePath, 'utf8')).replace('<h2>Action Surge</h2>\n<p>You can push yourself beyond your normal limits for a moment.</p>', '');

  expect(() => parseCharacterHtml(html)).toThrow(/Action Surge/);
});

test('renders Homebrewery v3 markdown for the full character book', async () => {
  const html = await readFile(fixturePath, 'utf8');
  const book = parseCharacterHtml(html);
  const markdown = renderHomebreweryMarkdown(book);

  expect(markdown).toContain('# Aria Thorn');
  expect(markdown).not.toMatch(/Level:/);
  expect(markdown).toContain('{{classTable,frame,wide');
  expect(markdown).toContain('| 20 | +6 | Extra Attack (3) |');
  expect(markdown).toContain('## Full Feature Reference');
  expect(markdown).toContain('### Action Surge');
  expect(markdown).toContain('{{footnote Character Overview}}');
  expect(markdown).toContain('{{pageNumber,auto}}');
  expect(markdown).toContain('\\column');
  expect(markdown).toContain('\\page');
});
