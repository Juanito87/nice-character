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
  expect(markdown).not.toContain('## How To Use This Book');
  expect(markdown).toContain('## Character Overview');
  expect(markdown).toContain('| Field | Value |');
  expect(markdown).toContain('{{classTable,frame,wide');
  expect(markdown).toContain('| 20 | +6 | Extra Attack (3) |');
  expect(markdown).toContain('## Full Feature Reference');
  expect(markdown).toContain('### Action Surge');
  expect(markdown).toContain('{{footnote Character Overview}}');
  expect(markdown).toContain('{{pageNumber,auto}}');
  expect(markdown).toContain('\\column');
  expect(markdown).toContain('\\page');
});

test('renders character overview and level one stats as wide framed tables', () => {
  const progressionRows = Array.from({ length: 20 }, (_, index) => (
    `<tr><td>${index + 1}</td><td>+2</td><td>Feature ${index + 1}</td><td></td><td></td><td></td><td></td></tr>`
  )).join('');
  const featureDescriptions = Array.from({ length: 20 }, (_, index) => (
    `<h2>Feature ${index + 1}</h2><p>Description ${index + 1}</p>`
  )).join('');

  const book = parseCharacterHtml(`
    <p>Character overview</p>
    <table><tr><td>Name</td><td>Escama Roja</td></tr><tr><td>Armor</td><td>Light, Medium</td></tr></table>
    <p>LV 1 stats</p>
    <table><tr><td>Attribute</td><td>Total score</td><td>Ability Modifier</td></tr><tr><td>DEX</td><td>16</td><td>+3</td></tr></table>
    <p>Level Progression</p>
    <table><tr><td>Level</td><td>Proficiency Bonus</td><td>Features Gained</td><td>Subclass Features</td><td>Resources</td><td>Decisions</td><td>Notes</td></tr>${progressionRows}</table>
    <p>Full Feature Reference</p>
    ${featureDescriptions}
    <p>Spell &amp; Resources</p>
    <p>No spells.</p>
    <p>Equipment &amp; Inventory</p>
    <p>Rope.</p>
    <p>Character Story</p>
    <p>A pirate.</p>
  `);
  const markdown = renderHomebreweryMarkdown(book);

  expect(markdown).toContain('## Character Overview');
  expect(markdown).toContain('| Name | Escama Roja |');
  expect(markdown).toContain('| Armor | Light, Medium |');
  expect(markdown).toContain('## LV 1 Stats');
  expect(markdown).toContain('| Attribute | Total score | Ability Modifier |');
  expect(markdown).toContain('| DEX | 16 | +3 |');
  expect(markdown).not.toContain('## How To Use This Book');
});

test('preserves equipment paragraphs and tables in generated markdown', () => {
  const progressionRows = Array.from({ length: 20 }, (_, index) => (
    `<tr><td>${index + 1}</td><td>+2</td><td>Feature ${index + 1}</td><td></td><td></td><td></td><td></td></tr>`
  )).join('');
  const featureDescriptions = Array.from({ length: 20 }, (_, index) => (
    `<h2>Feature ${index + 1}</h2><p>Description ${index + 1}</p>`
  )).join('');

  const book = parseCharacterHtml(`
    <p>Character overview</p>
    <table><tr><td>Name</td><td>Escama Roja</td></tr></table>
    <p>Level Progression</p>
    <table><tr><td>Level</td><td>Proficiency Bonus</td><td>Features Gained</td><td>Subclass Features</td><td>Resources</td><td>Decisions</td><td>Notes</td></tr>${progressionRows}</table>
    <p>Full Feature Reference</p>
    ${featureDescriptions}
    <p>Spell &amp; Resources</p>
    <p>No spells.</p>
    <p>Equipment &amp; Inventory</p>
    <p>Bracers of Defense</p>
    <p>While wearing these bracers, you gain a +2 bonus to AC.</p>
    <table><tr><td>Belt</td><td>Strength</td><td>Rarity</td></tr><tr><td>Hill</td><td>21</td><td>Rare</td></tr></table>
    <p>Character Story</p>
    <p>A pirate.</p>
  `);
  const markdown = renderHomebreweryMarkdown(book);

  expect(markdown).toContain('## Equipment & Inventory');
  expect(markdown).toContain('Bracers of Defense\n\nWhile wearing these bracers');
  expect(markdown).toContain('{{classTable,frame,wide\n| Belt | Strength | Rarity |');
  expect(markdown).toContain('| Hill | 21 | Rare |');
});

test('converts tab-separated equipment rows into generated tables', () => {
  const progressionRows = Array.from({ length: 20 }, (_, index) => (
    `<tr><td>${index + 1}</td><td>+2</td><td>Feature ${index + 1}</td><td></td><td></td><td></td><td></td></tr>`
  )).join('');
  const featureDescriptions = Array.from({ length: 20 }, (_, index) => (
    `<h2>Feature ${index + 1}</h2><p>Description ${index + 1}</p>`
  )).join('');

  const book = parseCharacterHtml(`
    <p>Character overview</p>
    <table><tr><td>Name</td><td>Escama Roja</td></tr></table>
    <p>Level Progression</p>
    <table><tr><td>Level</td><td>Proficiency Bonus</td><td>Features Gained</td><td>Subclass Features</td><td>Resources</td><td>Decisions</td><td>Notes</td></tr>${progressionRows}</table>
    <p>Full Feature Reference</p>
    ${featureDescriptions}
    <p>Spell &amp; Resources</p>
    <p>No spells.</p>
    <p>Equipment &amp; Inventory</p>
    <p>Belt	Strength	Rarity</p>
    <p>Belt of Giant Strength (hill)	21	Rare</p>
    <p>Belt of Giant Strength (storm)	29	Legendary</p>
    <p>Character Story</p>
    <p>A pirate.</p>
  `);
  const markdown = renderHomebreweryMarkdown(book);

  expect(markdown).toContain('{{classTable,frame,wide\n| Belt | Strength | Rarity |');
  expect(markdown).toContain('| Belt of Giant Strength (hill) | 21 | Rare |');
  expect(markdown).toContain('| Belt of Giant Strength (storm) | 29 | Legendary |');
});

test('inserts page breaks across long generated document sections', () => {
  const progressionRows = Array.from({ length: 20 }, (_, index) => (
    `<tr><td>${index + 1}</td><td>+2</td><td>Feature ${index + 1}</td><td></td><td></td><td></td><td></td></tr>`
  )).join('');
  const longDescription = Array.from({ length: 60 }, () => 'Long feature text.').join(' ');
  const featureDescriptions = Array.from({ length: 20 }, (_, index) => (
    `<h2>Feature ${index + 1}</h2><p>${longDescription}</p>`
  )).join('');
  const longEquipment = Array.from({ length: 120 }, () => '<p>Equipment paragraph with readable details.</p>').join('');
  const longStory = Array.from({ length: 120 }, () => 'Story paragraph with readable details.').join(' ');

  const book = parseCharacterHtml(`
    <p>Character overview</p>
    <table><tr><td>Name</td><td>Escama Roja</td></tr></table>
    <p>Level Progression</p>
    <table><tr><td>Level</td><td>Proficiency Bonus</td><td>Features Gained</td><td>Subclass Features</td><td>Resources</td><td>Decisions</td><td>Notes</td></tr>${progressionRows}</table>
    <p>Full Feature Reference</p>
    ${featureDescriptions}
    <p>Spell &amp; Resources</p>
    <p>No spells.</p>
    <p>Equipment &amp; Inventory</p>
    ${longEquipment}
    <p>Character Story</p>
    <p>${longStory}</p>
  `);
  const markdown = renderHomebreweryMarkdown(book);

  expect((markdown.match(/{{footnote Feature Reference}}/g) ?? [])).toHaveLength(20);
  expect((markdown.match(/{{footnote Equipment}}/g) ?? []).length).toBeGreaterThan(1);
  expect((markdown.match(/{{footnote Character Story}}/g) ?? []).length).toBeGreaterThan(1);
});

test('parses Mammoth paragraph-style section labels and common section aliases', () => {
  const progressionRows = Array.from({ length: 20 }, (_, index) => (
    `<tr><td>${index + 1}</td><td>+2</td><td>Feature ${index + 1}</td><td></td><td></td><td></td><td></td></tr>`
  )).join('');
  const featureDescriptions = Array.from({ length: 20 }, (_, index) => (
    `<h2>Feature ${index + 1}</h2><p>Description ${index + 1}</p>`
  )).join('');

  const book = parseCharacterHtml(`
    <p>Character overview</p>
    <table><tr><td>Name</td><td>Escama Roja</td></tr><tr><td>Class/Multiclass</td><td>Pugilist</td></tr></table>
    <p>How To Use This Book</p>
    <p>Use it at the table.</p>
    <p>Level Progression</p>
    <table><tr><td>Level</td><td>Proficiency Bonus</td><td>Features Gained</td><td>Subclass Features</td><td>Resources</td><td>Decisions</td><td>Notes</td></tr>${progressionRows}</table>
    <p>Full Feature Reference</p>
    ${featureDescriptions}
    <p>Spell &amp; Resources</p>
    <p>No spells.</p>
    <p>Equipment &amp; Inventory</p>
    <p>Rope.</p>
    <p>Character Story</p>
    <p>A pirate.</p>
  `);

  expect(book.overview.name).toBe('Escama Roja');
  expect(book.overview.classSubclassPath).toBe('Pugilist');
  expect(book.sections.spellsAndResources).toBe('No spells.');
  expect(book.assetInputs).toEqual({});
});

test('defaults missing how-to-use text for otherwise complete character books', () => {
  const progressionRows = Array.from({ length: 20 }, (_, index) => (
    `<tr><td>${index + 1}</td><td>+2</td><td>Feature ${index + 1}</td><td></td><td></td><td></td><td></td></tr>`
  )).join('');
  const featureDescriptions = Array.from({ length: 20 }, (_, index) => (
    `<h2>Feature ${index + 1}</h2><p>Description ${index + 1}</p>`
  )).join('');

  const book = parseCharacterHtml(`
    <p>Character overview</p>
    <table><tr><td>Name</td><td>Escama Roja</td></tr></table>
    <p>Level Progression</p>
    <table><tr><td>Level</td><td>Proficiency Bonus</td><td>Features Gained</td><td>Subclass Features</td><td>Resources</td><td>Decisions</td><td>Notes</td></tr>${progressionRows}</table>
    <p>Full Feature Reference</p>
    ${featureDescriptions}
    <p>Spell &amp; Resources</p>
    <p>No spells.</p>
    <p>Equipment &amp; Inventory</p>
    <p>Rope.</p>
    <p>Character Story</p>
    <p>A pirate.</p>
  `);

  expect(book.howToUse).toContain('Print the full book');
});

test('parses paragraph-style feature reference labels from progression names', () => {
  const progressionRows = Array.from({ length: 20 }, (_, index) => (
    `<tr><td>${index + 1}</td><td>+2</td><td>${index === 0 ? 'Pugilism' : ''}</td><td></td><td></td><td></td><td></td></tr>`
  )).join('');

  const book = parseCharacterHtml(`
    <p>Character overview</p>
    <table><tr><td>Name</td><td>Escama Roja</td></tr></table>
    <p>Level Progression</p>
    <table><tr><td>Level</td><td>Proficiency Bonus</td><td>Features Gained</td><td>Subclass Features</td><td>Resources</td><td>Decisions</td><td>Notes</td></tr>${progressionRows}</table>
    <p>Full Feature Reference</p>
    <p>Pugilism</p>
    <p>Your unarmed strikes are stronger.</p>
    <p>Spell &amp; Resources</p>
    <p>No spells.</p>
    <p>Equipment &amp; Inventory</p>
    <p>Rope.</p>
    <p>Character Story</p>
    <p>A pirate.</p>
  `);

  expect(book.features).toContainEqual({
    name: 'Pugilism',
    description: 'Your unarmed strikes are stronger.'
  });
});

test('expands ASI progression shorthand into a feature reference', () => {
  const progressionRows = Array.from({ length: 20 }, (_, index) => (
    `<tr><td>${index + 1}</td><td>+2</td><td>${index === 3 ? 'ASI' : ''}</td><td></td><td></td><td></td><td></td></tr>`
  )).join('');

  const book = parseCharacterHtml(`
    <p>Character overview</p>
    <table><tr><td>Name</td><td>Escama Roja</td></tr></table>
    <p>Level Progression</p>
    <table><tr><td>Level</td><td>Proficiency Bonus</td><td>Features Gained</td><td>Subclass Features</td><td>Resources</td><td>Decisions</td><td>Notes</td></tr>${progressionRows}</table>
    <p>Full Feature Reference</p>
    <p>Spell &amp; Resources</p>
    <p>No spells.</p>
    <p>Equipment &amp; Inventory</p>
    <p>Rope.</p>
    <p>Character Story</p>
    <p>A pirate.</p>
  `);

  expect(book.features).toContainEqual({
    name: 'ASI',
    description: 'Ability Score Improvement. Increase ability scores or choose a feat, depending on the rules used by the campaign.'
  });
});
