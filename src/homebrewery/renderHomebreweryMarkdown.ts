import type { CharacterBook, ContentBlock, FeatureReference, ProgressionLevel } from '../model/CharacterBook.js';

const textOnlyPageBudget = 2400;
const mixedProsePageBudget = 2800;
const featurePageBudget = 3200;
const tablePageBudget = 2400;
const introPageBudget = 2200;

type Page = {
    firstPageTitle: string;
    blocks: string[];
    budget: number;
    cost: number;
};

type RenderBlockOptions = {
  wideTables: boolean;
};

type TableSection = {
  title: string;
  rows: string[][];
  footnote: string;
};

type TablePage = {
  sections: TableSection[];
  cost: number;
  footnote: string;
};

export function renderHomebreweryMarkdown(book: CharacterBook): string {
  const hasSources = hasRenderableBlocks(book.sectionBlocks.sources);
  const lines: string[] = [
    ...renderTitlePage(book),
    '',
    ...renderOverviewPages(book),
    '',
    ...renderFeatureReference(book.features),
    '',
    ...renderPagedBlocks('Spells & Resources', 'Spells & Resources', book.sectionBlocks.spellsAndResources),
    '',
    ...renderPagedBlocks('Equipment & Inventory', 'Equipment', book.sectionBlocks.equipmentAndInventory, { wideTables: false }),
    '',
    ...renderPagedBlocks('Character Story', 'Character Story', book.sectionBlocks.characterStory, undefined, hasSources),
    '',
    ...renderPagedBlocks('Sources', 'Sources', book.sectionBlocks.sources, undefined, false)
  ];

  return lines.filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n').trimEnd() + '\n';
}

function renderTitlePage(book: CharacterBook): string[] {
  return [
    `# ${book.overview.name}`,
    '',
    book.overview.tagline ?? '',
    '',
    ...renderCoverIllustration(book),
    '',
    ...pageFooter('Character Title', true)
  ];
}

function renderOverviewPages(book: CharacterBook): string[] {
  const overviewSection: TableSection = {
    title: 'Character Overview',
    rows: [
      ['Field', 'Value'],
      ...book.overviewRows
    ],
    footnote: 'Character Overview'
  };
  const tableSectionsAfterDescription = [
    ...levelOneStatsSection(book),
    levelProgressionSection(book)
  ];

  if (book.overview.description) {
    const descriptionBlocks = descriptionContentBlocks(book.overview.description);
    if (canShareIntroPage(overviewSection, descriptionBlocks)) {
      return [
        ...renderOverviewAndDescriptionPage(overviewSection, descriptionBlocks),
        '',
        ...renderTableSectionPages(tableSectionsAfterDescription, true)
      ];
    }

    return [
      ...renderTableSectionPages([overviewSection], true),
      '',
      ...renderDescriptionPages(descriptionBlocks),
      '',
      ...renderTableSectionPages(tableSectionsAfterDescription, true)
    ];
  }

  return renderTableSectionPages([
    overviewSection,
    ...tableSectionsAfterDescription
  ], true);
}

function renderCoverIllustration(book: CharacterBook): string[] {
  const { illustration, name } = book.overview;
  if (!illustration) {
    return [];
  }

  return [
    '<div class="wide character-cover-illustration" style="display:flex;align-items:center;justify-content:center;margin-top:24px;">',
    `<img src="${escapeAttribute(illustration)}" alt="${escapeAttribute(`${name} illustration`)}" style="width:100%;max-height:650px;object-fit:contain;">`,
    '</div>'
  ];
}

function levelOneStatsSection(book: CharacterBook): TableSection[] {
  return book.levelOneStatsRows && book.levelOneStatsRows.length > 0
    ? [{
        title: 'LV 1 Stats',
        rows: book.levelOneStatsRows,
        footnote: 'LV 1 Stats'
      }]
    : [];
}

function levelProgressionSection(book: CharacterBook): TableSection {
  return {
    title: 'Level Progression',
    rows: [
      ['Level', 'Prof.', 'Features', 'Subclass', 'Resources', 'Decisions', 'Notes'],
      ...book.progression.map(renderProgressionRow)
    ],
    footnote: 'Level Progression'
  };
}

function renderTableSectionPages(sections: TableSection[], includeBreakAfter: boolean): string[] {
  if (sections.length === 0) {
    return [];
  }

  const pages: TablePage[] = [];
  let page: TablePage = { sections: [], cost: 0, footnote: sections[0]?.footnote ?? '' };

  for (const section of sections) {
    const sectionCost = estimateTableSectionCost(section);
    if (page.sections.length > 0 && page.cost + sectionCost > tablePageBudget) {
      pages.push(page);
      page = { sections: [], cost: 0, footnote: section.footnote };
    }
    page.sections.push(section);
    page.cost += sectionCost;
    page.footnote = section.footnote;
  }

  pages.push(page);
  return pages.flatMap((page, index) => [
    ...page.sections.flatMap((section) => [
      `## ${section.title}`,
      '',
      renderWideTable(section.rows),
      ''
    ]),
    ...pageFooter(page.footnote, index < pages.length - 1 || includeBreakAfter)
  ]);
}

function estimateTableSectionCost(section: TableSection): number {
  const cellTextCost = section.rows.reduce(
    (sum, row) => sum + row.reduce((rowSum, cell) => rowSum + cell.length, 0),
    0
  );
  const columnCount = Math.max(...section.rows.map((row) => row.length), 1);
  return 150 + (section.rows.length * 48) + (columnCount * 18) + (cellTextCost * 0.35);
}

function descriptionContentBlocks(description: string): ContentBlock[] {
  return splitParagraphs(description).map((text) => ({ type: 'paragraph', text }));
}

function canShareIntroPage(overviewSection: TableSection, descriptionBlocks: ContentBlock[]): boolean {
  return estimateTableSectionCost(overviewSection) + estimateBlocksCost(descriptionBlocks) <= introPageBudget;
}

function renderOverviewAndDescriptionPage(overviewSection: TableSection, descriptionBlocks: ContentBlock[]): string[] {
  const renderedDescriptionBlocks = descriptionBlocks
    .flatMap((block) => renderContentBlock(block, textOnlyPageBudget, { wideTables: true }));

  return [
    `## ${overviewSection.title}`,
    '',
    renderWideTable(overviewSection.rows),
    '',
    '## Character Description',
    '',
    ...joinRenderedBlocks(renderedDescriptionBlocks, true),
    ...pageFooter('Character Description', true)
  ];
}

function renderDescriptionPages(blocks: ContentBlock[]): string[] {
  return renderPagedBlocks('Character Description', 'Character Description', blocks, { wideTables: true }, true, true);
}

function splitParagraphs(value: string): string[] {
  return value.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
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
      forceBreakWhenFull: true,
      minimumBlocksBeforeBreak: 2
    });
  }

  pages.push(page);
  return renderPages(pages, 'Feature Reference', true);
}

function renderPagedBlocks(
  title: string,
  footnote: string,
  blocks: ContentBlock[],
  options: RenderBlockOptions = { wideTables: true },
  includeBreakAfter = true,
  useColumns = false
): string[] {
  if (blocks.length === 0) {
    return [];
  }

  const budget = pageBudgetForBlocks(blocks);
  const pages: Page[] = [];
  let page = newPage(`## ${title}`, budget);
  for (const block of blocks) {
    for (const rendered of renderContentBlock(block, budget, options)) {
      page = addBlockToPages({
        page,
        pages,
        block: rendered,
        forceBreakWhenFull: true
      });
    }
  }

  pages.push(page);
  return renderPages(pages, footnote, useColumns, includeBreakAfter);
}

function hasRenderableBlocks(blocks: ContentBlock[]): boolean {
  return blocks.length > 0;
}

function pageBudgetForBlocks(blocks: ContentBlock[]): number {
  return blocks.every((block) => block.type === 'paragraph')
    ? textOnlyPageBudget
    : mixedProsePageBudget;
}

function estimateBlocksCost(blocks: ContentBlock[]): number {
  return blocks.reduce((sum, block) => {
    if (block.type === 'table') {
      return sum + estimateCost(renderTable(block.rows, true));
    }
    if (block.type === 'itemTitle' || block.type === 'subtitle') {
      return sum + estimateCost(block.title);
    }
    return sum + estimateCost(formatParagraph(block.text));
  }, 0);
}

function renderContentBlock(block: ContentBlock, budget: number, options: RenderBlockOptions): string[] {
  if (block.type === 'table') {
    return [renderTable(block.rows, options.wideTables)];
  }
  if (block.type === 'itemTitle' || block.type === 'subtitle') {
    return [`### ${block.title}`];
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
  return { firstPageTitle: title, blocks: [], budget, cost: estimateCost(title) };
}

function addBlockToPages(options: {
  page: Page;
  pages: Page[];
  block: string;
  forceBreakWhenFull: boolean;
  minimumBlocksBeforeBreak?: number;
}): Page {
  const blockCost = estimateCost(options.block);
  const minimumBlocksBeforeBreak = options.minimumBlocksBeforeBreak ?? 1;
  const hasEnoughBlocksToBreak = options.page.blocks.length >= minimumBlocksBeforeBreak
    || isOversizedSingleBlock(options.page);
  const shouldBreak = options.forceBreakWhenFull
    && options.page.blocks.length > 0
    && hasEnoughBlocksToBreak
    && options.page.cost + blockCost > options.page.budget;

  if (shouldBreak) {
    options.pages.push(options.page);
    const next = newPage('', options.page.budget);
    next.blocks.push(options.block);
    next.cost += blockCost;
    return next;
  }

  options.page.blocks.push(options.block);
  options.page.cost += blockCost;
  return options.page;
}

function isOversizedSingleBlock(page: Page): boolean {
  return page.blocks.length === 1 && estimateCost(page.blocks[0] ?? '') > page.budget;
}

function renderPages(pages: Page[], footnote: string, useColumns = false, includeBreakAfter = true): string[] {
  return pages.flatMap((page, index) => [
    ...(index === 0 && page.firstPageTitle ? [page.firstPageTitle, ''] : []),
    ...joinRenderedBlocks(page.blocks, useColumns),
    ...pageFooter(footnote, index < pages.length - 1 || includeBreakAfter)
  ]);
}

function joinRenderedBlocks(blocks: string[], useColumns: boolean): string[] {
  const columnAfterIndex = useColumns ? balancedColumnAfterIndex(blocks) : -1;
  return blocks.flatMap((block, index) => (
    index === columnAfterIndex ? [block, '', '\\column', ''] : [block, '']
  ));
}

function balancedColumnAfterIndex(blocks: string[]): number {
  if (blocks.length < 2) {
    return -1;
  }

  const totalCost = blocks.reduce((sum, block) => sum + estimateCost(block), 0);
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  let firstColumnCost = 0;

  for (let index = 0; index < blocks.length - 1; index += 1) {
    firstColumnCost += estimateCost(blocks[index] ?? '');
    const distance = Math.abs((totalCost / 2) - firstColumnCost);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function renderWideTable(rows: string[][]): string {
  return renderTable(rows, true);
}

function renderTable(rows: string[][], wide: boolean): string {
  const [header, ...body] = rows;
  if (!header) {
    return '';
  }

  return [
    wide ? '{{classTable,frame,wide' : '{{classTable,frame',
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
