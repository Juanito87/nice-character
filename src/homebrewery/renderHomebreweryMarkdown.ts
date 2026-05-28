import type { CharacterBook } from '../model/CharacterBook.js';

export function renderHomebreweryMarkdown(book: CharacterBook): string {
  const lines: string[] = [
    `# ${book.overview.name}`,
    '',
    book.overview.tagline ?? '',
    '',
    '## Character Overview',
    '',
    overviewLine('Pronouns', book.overview.pronouns),
    overviewLine('Ancestry/Species', book.overview.ancestrySpecies),
    overviewLine('Class/Subclass Path', book.overview.classSubclassPath),
    overviewLine('Background', book.overview.background),
    overviewLine('Player', book.overview.player),
    overviewLine('Campaign', book.overview.campaign),
    '',
    '\\column',
    '',
    '## How To Use This Book',
    '',
    book.howToUse,
    '',
    ...pageFooter('Character Overview', true),
    '',
    '## Level Progression',
    '',
    '{{classTable,frame,wide',
    '| Level | Prof. | Features | Subclass | Resources | Decisions | Notes |',
    '| :-- | :-- | :-- | :-- | :-- | :-- | :-- |',
    ...book.progression.map((entry) => (
      `| ${entry.level} | ${entry.proficiencyBonus} | ${joinList(entry.featuresGained)} | ${joinList(entry.subclassFeatures)} | ${entry.resources} | ${entry.decisions} | ${entry.notes} |`
    )),
    '}}',
    '',
    ...pageFooter('Level Progression', true),
    '',
    '## Full Feature Reference',
    '',
    ...book.features.flatMap((feature) => [`### ${feature.name}`, '', feature.description, '']),
    ...pageFooter('Feature Reference', true),
    '',
    '## Spells & Resources',
    '',
    book.sections.spellsAndResources ?? '',
    '',
    '\\column',
    '',
    '## Equipment & Inventory',
    '',
    book.sections.equipmentAndInventory ?? '',
    '',
    ...pageFooter('Character Details', true),
    '',
    '## Character Story',
    '',
    book.sections.characterStory ?? '',
    '',
    ...pageFooter('Character Story', false)
  ];

  return lines.filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n').trimEnd() + '\n';
}

function overviewLine(label: string, value?: string): string {
  return value ? `**${label}:** ${value}` : '';
}

function joinList(values: string[]): string {
  return values.join(', ');
}

function pageFooter(label: string, includePageBreak: boolean): string[] {
  return [
    `{{footnote ${label}}}`,
    '{{pageNumber,auto}}',
    includePageBreak ? '\\page' : ''
  ].filter(Boolean);
}
