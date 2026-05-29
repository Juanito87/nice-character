import type { CharacterBook, ContentBlock, FeatureReference, ProgressionLevel } from '../model/CharacterBook.js';

const prosePageBudget = 1800;
const featurePageBudget = 1500;

type Page = {
  title: string;
  blocks: string[];
  budget: number;
  cost: number;
};

export function renderHomebreweryMarkdown(book: CharacterBook): string {
  const lines: string[] = [
    `# ${book.overview.name}`,
    '',
    book.overview.tagline ?? '',
    '',
    '## Character Overview',
    '',
    renderWideTable([
      ['Field', 'Value'],
      ...book.overviewRows
    ]),
    '',
    ...(book.levelOneStatsRows && book.levelOneStatsRows.length > 0
      ? ['## LV 1 Stats', '', renderWideTable(book.levelOneStatsRows), '']
      : []),
    ...pageFooter('Character Overview', true),
    '',
    '## Level Progression',
    '',
    renderWideTable([
      ['Level', 'Prof.', 'Features', 'Subclass', 'Resources', 'Decisions', 'Notes'],
      ...book.progression.map(renderProgressionRow)
    ]),
    '',
    ...pageFooter('Level Progression', true),
    '',
    ...renderFeatureReference(book.features),
    '',
    ...renderPagedBlocks('Spells & Resources', 'Spells & Resources', book.sectionBlocks.spellsAndResources),
    '',
    ...renderPagedBlocks('Equipment & Inventory', 'Equipment', book.sectionBlocks.equipmentAndInventory),
    '',
    ...renderPagedBlocks('Character Story', 'Character Story', book.sectionBlocks.characterStory, prosePageBudget)
  ];

  return lines.filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n').trimEnd() + '\n';
}

function renderProgressionRow(entry: ProgressionLevel): string[] {
  return [
    String(entry.level),
    entry.proficiencyBonus,
    joinList(entry.featuresGained),
    joinList(entry.subclassFeatures),
    entry.resources,
    entry.decisions,
    entry.notes
  ];
}

function renderFeatureReference(features: FeatureReference[]): string[] {
  const pages: Page[] = [];
  let page = newPage('## Full Feature Reference', featurePageBudget);

  for (const feature of features) {
    const rendered = [`### ${feature.name}`, '', feature.description].join('\n');
    page = addBlockToPages({
      page,
      pages,
      block: rendered,
      nextPageTitle: '## Full Feature Reference',
      forceBreakWhenFull: true
    });
  }

  pages.push(page);
  return renderPages(pages, 'Feature Reference', true);
}

function renderPagedBlocks(title: string, footnote: string, blocks: ContentBlock[], budget = prosePageBudget): string[] {
  if (blocks.length === 0) {
    return [`## ${title}`, '', ...pageFooter(footnote, true)];
  }

  const pages: Page[] = [];
  let page = newPage(`## ${title}`, budget);
  for (const block of blocks) {
    for (const rendered of renderContentBlock(block, budget)) {
      page = addBlockToPages({
        page,
        pages,
        block: rendered,
        nextPageTitle: `## ${title}`,
        forceBreakWhenFull: true
      });
    }
  }

  pages.push(page);
  return renderPages(pages, footnote);
}

function renderContentBlock(block: ContentBlock, budget: number): string[] {
  if (block.type === 'table') {
    return [renderWideTable(block.rows)];
  }

  const text = formatParagraph(block.text);
  if (estimateCost(text) <= budget) {
    return [text];
  }

  return splitLongParagraph(text, budget).map((text) => text.trim()).filter(Boolean);
}

function formatParagraph(text: string): string {
  return text.replace(/\t/g, ' | ');
}

function splitLongParagraph(text: string, budget: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (estimateCost(next) > budget && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }
  return chunks;
}

function newPage(title: string, budget: number): Page {
  return { title, blocks: [], budget, cost: estimateCost(title) };
}

function addBlockToPages(options: {
  page: Page;
  pages: Page[];
  block: string;
  nextPageTitle: string;
  forceBreakWhenFull: boolean;
}): Page {
  const blockCost = estimateCost(options.block);
  const shouldBreak = options.forceBreakWhenFull
    && options.page.blocks.length > 0
    && options.page.cost + blockCost > options.page.budget;

  if (shouldBreak) {
    options.pages.push(options.page);
    const next = newPage(options.nextPageTitle, options.page.budget);
    next.blocks.push(options.block);
    next.cost += blockCost;
    return next;
  }

  options.page.blocks.push(options.block);
  options.page.cost += blockCost;
  return options.page;
}

function renderPages(pages: Page[], footnote: string, useColumns = false): string[] {
  return pages.flatMap((page, index) => [
    page.title,
    '',
    ...joinRenderedBlocks(page.blocks, useColumns),
    ...pageFooter(footnote, index < pages.length - 1 || shouldBreakAfterSection(footnote))
  ]);
}

function shouldBreakAfterSection(footnote: string): boolean {
  return footnote !== 'Character Story';
}

function joinRenderedBlocks(blocks: string[], useColumns: boolean): string[] {
  const columnAfterIndex = useColumns && blocks.length > 3 ? Math.ceil(blocks.length / 2) - 1 : -1;
  return blocks.flatMap((block, index) => (
    index === columnAfterIndex ? [block, '', '\\column', ''] : [block, '']
  ));
}

function renderWideTable(rows: string[][]): string {
  const [header, ...body] = rows;
  if (!header) {
    return '';
  }

  return [
    '{{classTable,frame,wide',
    renderTableRow(header),
    renderTableRow(header.map(() => ':--')),
    ...body.map(renderTableRow),
    '}}'
  ].join('\n');
}

function renderTableRow(row: string[]): string {
  return `| ${row.map(escapeTableCell).join(' | ')} |`;
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

function estimateCost(value: string): number {
  return value.length;
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
