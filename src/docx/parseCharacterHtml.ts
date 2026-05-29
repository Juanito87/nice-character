import type { AssetInputs, CharacterBook, FeatureReference, ProgressionLevel } from '../model/CharacterBook.js';

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
  const progression = parseProgression(sectionMap.get('Level Progression') ?? '');
  const features = parseFeatures(sectionMap.get('Full Feature Reference') ?? '', progression);
  const proseSections = {
    spellsAndResources: textContent(sectionMap.get('Spells & Resources') ?? ''),
    equipmentAndInventory: textContent(sectionMap.get('Equipment & Inventory') ?? ''),
    characterStory: textContent(sectionMap.get('Character Story') ?? '')
  };
  const assetInputs = parseAssetInputs(sectionMap.get('Asset Inputs') ?? '');

  validateLevels(progression);
  validateFeatureReferences(progression, features);

  return {
    overview,
    howToUse: textContent(sectionMap.get('How To Use This Book') ?? '') || defaultHowToUse,
    progression,
    features,
    sections: proseSections,
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
  const rows = parseTableRows(html);
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
  for (const row of parseTableRows(html)) {
    const key = normalizeKey(row[0] ?? '');
    const value = row[1] ?? '';
    if (key) {
      fields.set(key, value);
    }
  }
  return fields;
}

function parseTableRows(html: string): string[][] {
  const rowPattern = /<tr[^>]*>(.*?)<\/tr>/gis;
  return [...html.matchAll(rowPattern)].map((rowMatch) => {
    const cellPattern = /<t[dh][^>]*>(.*?)<\/t[dh]>/gis;
    return [...(rowMatch[1] ?? '').matchAll(cellPattern)].map((cellMatch) => textContent(cellMatch[1] ?? ''));
  });
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

function cleanText(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
