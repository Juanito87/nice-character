import type { AssetInputs, CharacterBook, ContentBlock, FeatureReference, ProgressionLevel } from '../model/CharacterBook.js';

const requiredSections = [
  'Character Overview',
  'Level Progression',
  'Full Feature Reference',
  'Spells & Resources',
  'Equipment & Inventory',
  'Character Story'
];

const defaultHowToUse = 'Print the full book and mark each level when gained. Use the progression table to see what changes at each level, then use the feature reference when a rule or ability needs the full text at the table.';

const sectionAliases = new Map([
  ['character overview', 'Character Overview'],
  ['how to use this book', 'How To Use This Book'],
  ['level progression', 'Level Progression'],
  ['full feature reference', 'Full Feature Reference'],
  ['spells & resources', 'Spells & Resources'],
  ['spell & resources', 'Spells & Resources'],
  ['spells and resources', 'Spells & Resources'],
  ['spell and resources', 'Spells & Resources'],
  ['equipment & inventory', 'Equipment & Inventory'],
  ['equipment and inventory', 'Equipment & Inventory'],
  ['character story', 'Character Story'],
  ['asset inputs', 'Asset Inputs']
]);

const equipmentSubtitles = new Set([
  'starting gear',
  'wanted items',
  'utility items',
  'flavors items'
]);

type Section = {
  title: string;
  html: string;
};

export function parseCharacterHtml(html: string): CharacterBook {
  const sections = splitH1Sections(html);
  const sectionMap = new Map(sections.map((section) => [section.title, section.html]));

  for (const section of requiredSections) {
    if (!sectionMap.has(section)) {
      throw new Error(`Missing required section: ${section}`);
    }
  }

  const overview = parseOverview(sectionMap.get('Character Overview') ?? '');
  const overviewRows = parseFirstTableRows(sectionMap.get('Character Overview') ?? '');
  const levelOneStatsRows = parseLevelOneStatsRows(sectionMap.get('Character Overview') ?? '');
  const progression = parseProgression(sectionMap.get('Level Progression') ?? '');
  const features = parseFeatures(sectionMap.get('Full Feature Reference') ?? '', progression);
  const sectionBlocks = {
    spellsAndResources: parseContentBlocks(sectionMap.get('Spells & Resources') ?? ''),
    equipmentAndInventory: parseContentBlocks(sectionMap.get('Equipment & Inventory') ?? '', 'equipment'),
    characterStory: parseContentBlocks(sectionMap.get('Character Story') ?? '', 'story')
  };
  const proseSections = {
    spellsAndResources: renderBlockText(sectionBlocks.spellsAndResources),
    equipmentAndInventory: renderBlockText(sectionBlocks.equipmentAndInventory),
    characterStory: renderBlockText(sectionBlocks.characterStory)
  };
  const assetInputs = parseAssetInputs(sectionMap.get('Asset Inputs') ?? '');

  validateLevels(progression);
  validateFeatureReferences(progression, features);

  return {
    overview,
    overviewRows,
    levelOneStatsRows,
    howToUse: textContent(sectionMap.get('How To Use This Book') ?? '') || defaultHowToUse,
    progression,
    features,
    sections: proseSections,
    sectionBlocks,
    assetInputs
  };
}

function splitH1Sections(html: string): Section[] {
  const sections: Section[] = [];
  const headingPattern = /<h1[^>]*>(.*?)<\/h1>|<p[^>]*>(.*?)<\/p>/gis;
  const matches = [...html.matchAll(headingPattern)];
  const sectionMatches = matches
    .map((match) => ({
      match,
      title: canonicalSectionTitle(cleanText(match[1] ?? match[2] ?? ''))
    }))
    .filter((match): match is { match: RegExpExecArray; title: string } => Boolean(match.title));

  for (let index = 0; index < sectionMatches.length; index += 1) {
    const { match, title } = sectionMatches[index] ?? {};
    const next = sectionMatches[index + 1]?.match;
    if (!match || !title) continue;
    const start = (match.index ?? 0) + match[0].length;
    const end = next?.index ?? html.length;
    sections.push({ title, html: html.slice(start, end) });
  }

  return sections;
}

function canonicalSectionTitle(value: string): string | undefined {
  return sectionAliases.get(value.toLowerCase().replace(/\s+/g, ' '));
}

function parseOverview(html: string): CharacterBook['overview'] {
  const fields = parseKeyValueTable(html);
  const name = fields.get('name');
  if (!name) {
    throw new Error('Character Overview must include Name');
  }
  if (fields.has('level')) {
    throw new Error('Character Overview must not include a current Level field');
  }

  return {
    name,
    pronouns: fields.get('pronouns'),
    ancestrySpecies: fields.get('ancestry/species') ?? fields.get('ancestry') ?? fields.get('species'),
    classSubclassPath: fields.get('class/subclass path') ?? fields.get('class/multiclass') ?? fields.get('class'),
    background: fields.get('background'),
    player: fields.get('player'),
    campaign: fields.get('campaign'),
    tagline: fields.get('tagline')
  };
}

function parseProgression(html: string): ProgressionLevel[] {
  const rows = parseFirstTableRows(html);
  if (rows.length < 2) {
    throw new Error('Level Progression must include a header row and levels 1-20');
  }

  return rows.slice(1).map((row) => ({
    level: Number.parseInt(row[0] ?? '', 10),
    proficiencyBonus: row[1] ?? '',
    featuresGained: splitList(row[2] ?? ''),
    subclassFeatures: splitList(row[3] ?? ''),
    resources: row[4] ?? '',
    decisions: row[5] ?? '',
    notes: row[6] ?? ''
  }));
}

function parseFeatures(html: string, progression: ProgressionLevel[]): FeatureReference[] {
  const featurePattern = /<h2[^>]*>(.*?)<\/h2>(.*?)(?=<h2[^>]*>|$)/gis;
  const headingFeatures = [...html.matchAll(featurePattern)].map((match) => ({
    name: cleanText(match[1] ?? ''),
    description: textContent(match[2] ?? '')
  })).filter((feature) => feature.name.length > 0);
  if (headingFeatures.length > 0) {
    return headingFeatures;
  }

  return parseParagraphFeatureReferences(html, referencedFeatureNames(progression));
}

function parseParagraphFeatureReferences(html: string, featureNames: string[]): FeatureReference[] {
  const paragraphs = [...html.matchAll(/<p[^>]*>(.*?)<\/p>/gis)].map((match) => ({
    text: cleanText(match[1] ?? ''),
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length
  }));
  const features: FeatureReference[] = [];

  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index];
    const name = featureNames.find((featureName) => sameText(featureName, paragraph?.text ?? ''));
    if (!paragraph || !name) continue;

    const nextFeature = paragraphs.slice(index + 1).find((candidate) => (
      featureNames.some((featureName) => sameText(featureName, candidate.text))
    ));
    const descriptionHtml = html.slice(paragraph.end, nextFeature?.start ?? html.length);
    features.push({
      name,
      description: textContent(descriptionHtml) || name
    });
  }

  return addBuiltInFeatureReferences(features, featureNames);
}

function addBuiltInFeatureReferences(features: FeatureReference[], featureNames: string[]): FeatureReference[] {
  const existing = new Set(features.map((feature) => feature.name.toLowerCase()));
  const builtIns: FeatureReference[] = [];
  if (featureNames.some((name) => sameText(name, 'ASI')) && !existing.has('asi')) {
    builtIns.push({
      name: 'ASI',
      description: 'Ability Score Improvement. Increase ability scores or choose a feat, depending on the rules used by the campaign.'
    });
  }
  return [...features, ...builtIns];
}

function parseAssetInputs(html: string): AssetInputs {
  const fields = parseKeyValueTable(html);
  return {
    summary: fields.get('summary'),
    imagePrompt: fields.get('imageprompt') ?? fields.get('image prompt'),
    stlPrompt: fields.get('stlprompt') ?? fields.get('stl prompt')
  };
}

function parseKeyValueTable(html: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const row of parseFirstTableRows(html)) {
    const key = normalizeKey(row[0] ?? '');
    const value = row[1] ?? '';
    if (key) {
      fields.set(key, value);
    }
  }
  return fields;
}

function parseLevelOneStatsRows(html: string): string[][] | undefined {
  const marker = html.search(/<p[^>]*>\s*(?:lv|level)\s*(?:1|one)\s*stats\s*<\/p>/i);
  if (marker === -1) {
    return undefined;
  }
  const afterMarker = html.slice(marker);
  const table = afterMarker.match(/<table[^>]*>.*?<\/table>/is)?.[0];
  return table ? parseTableRows(table) : undefined;
}

function parseFirstTableRows(html: string): string[][] {
  const table = html.match(/<table[^>]*>.*?<\/table>/is)?.[0] ?? '';
  return parseTableRows(table);
}

function parseTableRows(html: string): string[][] {
  const rowPattern = /<tr[^>]*>(.*?)<\/tr>/gis;
  return [...html.matchAll(rowPattern)].map((rowMatch) => {
    const cellPattern = /<t[dh][^>]*>(.*?)<\/t[dh]>/gis;
    return [...(rowMatch[1] ?? '').matchAll(cellPattern)].map((cellMatch) => textContent(cellMatch[1] ?? ''));
  });
}

function parseContentBlocks(html: string, mode: 'default' | 'equipment' | 'story' = 'default'): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const blockPattern = /<table[^>]*>.*?<\/table>|<p[^>]*>.*?<\/p>/gis;
  for (const match of html.matchAll(blockPattern)) {
    const value = match[0] ?? '';
    if (value.toLowerCase().startsWith('<table')) {
      const rows = parseTableRows(value);
      if (rows.length > 0) {
        blocks.push({ type: 'table', rows });
      }
    } else {
      const text = textContentWithStructure(value);
      const itemTitle = parseItemTitle(text);
      if (itemTitle) {
        blocks.push({ type: 'itemTitle', title: itemTitle });
      } else if (isSubtitle(text, mode)) {
        blocks.push({ type: 'subtitle', title: text });
      } else if (text) {
        blocks.push({ type: 'paragraph', text });
      }
    }
  }
  return coalesceTabbedTables(blocks);
}

function renderBlockText(blocks: ContentBlock[]): string {
  return blocks.map((block) => (
    block.type === 'paragraph'
      ? block.text
      : block.type === 'itemTitle'
        ? block.title
        : block.type === 'subtitle'
          ? block.title
      : block.rows.map((row) => row.join('\t')).join('\n')
  )).join('\n\n');
}

function parseItemTitle(text: string): string | undefined {
  const match = text.match(/^item:\s*(.+)$/i);
  return match ? cleanText(match[1] ?? '') : undefined;
}

function isSubtitle(text: string, mode: 'default' | 'equipment' | 'story'): boolean {
  if (!text) {
    return false;
  }
  if (mode === 'equipment') {
    return equipmentSubtitles.has(cleanText(text).toLowerCase());
  }
  if (mode === 'story') {
    return !text.endsWith('.');
  }
  return false;
}

function coalesceTabbedTables(blocks: ContentBlock[]): ContentBlock[] {
  const normalized: ContentBlock[] = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (!block || block.type !== 'paragraph' || !isTabbedRow(block.text)) {
      if (block) normalized.push(block);
      continue;
    }

    const rows: string[][] = [];
    let cursor = index;
    while (cursor < blocks.length) {
      const candidate = blocks[cursor];
      if (!candidate || candidate.type !== 'paragraph' || !isTabbedRow(candidate.text)) {
        break;
      }
      rows.push(splitTabbedRow(candidate.text));
      cursor += 1;
    }

    if (rows.length > 1 && rows.every((row) => row.length === rows[0]?.length)) {
      normalized.push({ type: 'table', rows });
      index = cursor - 1;
    } else {
      normalized.push(block);
    }
  }
  return normalized;
}

function isTabbedRow(value: string): boolean {
  return !value.includes('\n') && splitTabbedRow(value).length > 1;
}

function splitTabbedRow(value: string): string[] {
  return value.split('\t').map((cell) => cleanText(cell)).filter(Boolean);
}

function validateLevels(progression: ProgressionLevel[]): void {
  const found = new Set(progression.map((entry) => entry.level).filter((level) => Number.isInteger(level)));
  for (let level = 1; level <= 20; level += 1) {
    if (!found.has(level)) {
      throw new Error(`Level Progression is missing level ${level}`);
    }
  }
}

function validateFeatureReferences(progression: ProgressionLevel[], features: FeatureReference[]): void {
  const described = new Set(features.map((feature) => feature.name.toLowerCase()));
  const referenced = new Set<string>();
  for (const level of progression) {
    for (const name of [...level.featuresGained, ...level.subclassFeatures]) {
      if (name) {
        referenced.add(name);
      }
    }
  }

  const missing = [...referenced].filter((name) => !described.has(name.toLowerCase()));
  if (missing.length > 0) {
    throw new Error(`Missing full feature descriptions for: ${missing.join(', ')}`);
  }
}

function referencedFeatureNames(progression: ProgressionLevel[]): string[] {
  const referenced = new Set<string>();
  for (const level of progression) {
    for (const name of [...level.featuresGained, ...level.subclassFeatures]) {
      if (name) {
        referenced.add(name);
      }
    }
  }
  return [...referenced];
}

function sameText(left: string, right: string): boolean {
  return cleanText(left).toLowerCase() === cleanText(right).toLowerCase();
}

function splitList(value: string): string[] {
  return value.split(/,|;/).map((item) => item.trim()).filter(Boolean);
}

function normalizeKey(value: string): string {
  return cleanText(value).toLowerCase();
}

function textContent(html: string): string {
  return cleanText(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n'));
}

function textContentWithStructure(html: string): string {
  return decodeText(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n'))
    .split('\n')
    .map((line) => line.replace(/ {2,}/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function cleanText(value: string): string {
  return decodeText(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeText(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}
