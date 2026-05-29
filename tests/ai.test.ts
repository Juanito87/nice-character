import { MockAssetProvider } from '../src/ai/MockAssetProvider.js';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { applyGeneratedAssets, prepareCharacterAiAssets } from '../src/ai/prepareCharacterAiAssets.js';
import { createAssetProvider } from '../src/ai/createAssetProvider.js';
import { OpenAiAssetProvider } from '../src/ai/OpenAiAssetProvider.js';
import { GeminiAssetProvider } from '../src/ai/GeminiAssetProvider.js';
import { renderHomebreweryMarkdown } from '../src/homebrewery/renderHomebreweryMarkdown.js';
import type { CharacterBook } from '../src/model/CharacterBook.js';

test('mock asset provider returns deterministic summary and prompt text', async () => {
  const provider = new MockAssetProvider();
  const character = {
    overview: { name: 'Aria Thorn', tagline: 'A disciplined duelist.' },
    overviewRows: [['Name', 'Aria Thorn'], ['Tagline', 'A disciplined duelist.']],
    howToUse: '',
    progression: [],
    features: [],
    sections: {},
    sectionBlocks: {
      spellsAndResources: [],
      equipmentAndInventory: [],
      characterStory: [],
      sources: []
    },
    assetInputs: {}
  };

  await expect(provider.generateSummary(character)).resolves.toContain('Aria Thorn');
  await expect(provider.generateDescription(character)).resolves.toContain('Aria Thorn');
  await expect(provider.generateImagePrompt(character)).resolves.toContain('portrait');
  await expect(provider.generateStlPrompt(character)).resolves.toContain('miniature');
});

test('prepares missing AI sidecars without mutating the source docx', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nice-character-ai-'));
  const characterDir = join(root, 'characters/aria-thorn');
  const docxPath = join(characterDir, 'character.docx');
  await mkdir(characterDir, { recursive: true });
  await writeFile(docxPath, 'original docx bytes');

  const result = await prepareCharacterAiAssets({
    characterDir,
    docxPath,
    character: minimalCharacter({ description: undefined, illustration: undefined }),
    provider: new MockAssetProvider()
  });

  expect(await readFile(docxPath, 'utf8')).toBe('original docx bytes');
  expect(result.created.sort()).toEqual([
    'generated/assets.json',
    'generated/description.md',
    'generated/illustration.png',
    'generated/image-prompt.md'
  ]);
  expect(await readFile(join(characterDir, 'generated/description.md'), 'utf8')).toContain('Aria Thorn');
  expect(await readFile(join(characterDir, 'generated/image-prompt.md'), 'utf8')).toContain('portrait');
  expect(await readFile(join(characterDir, 'generated/illustration.png'), 'utf8')).toContain('Mock illustration placeholder for Aria Thorn');
  const manifest = JSON.parse(await readFile(join(characterDir, 'generated/assets.json'), 'utf8')) as {
    provider: string;
    sourceDocx: string;
    created: string[];
    skipped: string[];
  };
  expect(manifest.provider).toBe('mock');
  expect(manifest.sourceDocx).toBe('character.docx');
  expect(manifest.created).toContain('generated/description.md');
  expect(manifest.skipped).toHaveLength(0);
});

test('preparation skips manual description and illustration unless forced', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nice-character-ai-'));
  const characterDir = join(root, 'characters/aria-thorn');
  await mkdir(join(characterDir, 'generated'), { recursive: true });
  await writeFile(join(characterDir, 'generated/description.md'), 'Existing generated description');

  const result = await prepareCharacterAiAssets({
    characterDir,
    docxPath: join(characterDir, 'character.docx'),
    character: minimalCharacter({
      description: 'Manual description.',
      illustration: 'assets/manual.png'
    }),
    provider: new MockAssetProvider()
  });

  expect(result.created).toEqual(['generated/assets.json']);
  expect(result.skipped.sort()).toEqual([
    'generated/description.md',
    'generated/illustration.png',
    'generated/image-prompt.md'
  ]);
  expect(await readFile(join(characterDir, 'generated/description.md'), 'utf8')).toBe('Existing generated description');
});

test('generated illustration is used only when manual illustration is missing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nice-character-ai-'));
  const characterDir = join(root, 'characters/aria-thorn');
  await mkdir(join(characterDir, 'generated'), { recursive: true });
  await writeFile(join(characterDir, 'generated/illustration.png'), 'placeholder');

  const generated = await applyGeneratedAssets(minimalCharacter({ illustration: undefined }), characterDir);
  const manual = await applyGeneratedAssets(minimalCharacter({ illustration: 'assets/manual.png' }), characterDir);

  expect(generated.overview.illustration).toBe('generated/illustration.png');
  expect(renderHomebreweryMarkdown(generated)).toContain('src="generated/illustration.png"');
  expect(manual.overview.illustration).toBe('assets/manual.png');
  expect(renderHomebreweryMarkdown(manual)).toContain('src="assets/manual.png"');
});

test('provider factory creates mock, OpenAI, and Gemini providers', () => {
  expect(createAssetProvider({ provider: 'mock' })).toBeInstanceOf(MockAssetProvider);
  expect(createAssetProvider({ provider: 'openai', apiKey: 'openai-key' })).toBeInstanceOf(OpenAiAssetProvider);
  expect(createAssetProvider({ provider: 'gemini', apiKey: 'gemini-key' })).toBeInstanceOf(GeminiAssetProvider);
  expect(() => createAssetProvider({ provider: 'openai' })).toThrow(/OPENAI_API_KEY/);
  expect(() => createAssetProvider({ provider: 'gemini' })).toThrow(/GEMINI_API_KEY/);
});

test('OpenAI provider uses Responses API and image generation tool', async () => {
  const calls: Array<{ url: string; body: any }> = [];
  const provider = new OpenAiAssetProvider({
    apiKey: 'test-key',
    fetch: async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
      return {
        ok: true,
        json: async () => calls.length === 1
          ? { output_text: 'OpenAI description' }
          : { output: [{ type: 'image_generation_call', result: Buffer.from('png').toString('base64') }] }
      } as Response;
    }
  });

  await expect(provider.generateDescription(minimalCharacter())).resolves.toBe('OpenAI description');
  await expect(provider.generateIllustration(minimalCharacter(), 'portrait prompt')).resolves.toEqual(Buffer.from('png'));
  expect(calls[0]?.url).toContain('/v1/responses');
  expect(calls[1]?.body.tools).toEqual([{ type: 'image_generation' }]);
});

test('Gemini provider uses generateContent for text and image output', async () => {
  const calls: Array<{ url: string; body: any }> = [];
  const provider = new GeminiAssetProvider({
    apiKey: 'test-key',
    fetch: async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
      return {
        ok: true,
        json: async () => calls.length === 1
          ? { candidates: [{ content: { parts: [{ text: 'Gemini description' }] } }] }
          : { candidates: [{ content: { parts: [{ inlineData: { data: Buffer.from('png').toString('base64') } }] } }] }
      } as Response;
    }
  });

  await expect(provider.generateDescription(minimalCharacter())).resolves.toBe('Gemini description');
  await expect(provider.generateIllustration(minimalCharacter(), 'portrait prompt')).resolves.toEqual(Buffer.from('png'));
  expect(calls[0]?.url).toContain(':generateContent');
  expect(calls[1]?.body.contents[0].parts[0].text).toContain('portrait prompt');
});

function minimalCharacter(overview: Partial<CharacterBook['overview']> = {}): CharacterBook {
  const progression = Array.from({ length: 20 }, (_, index) => ({
    level: index + 1,
    proficiencyBonus: '+2',
    featuresGained: [],
    subclassFeatures: [],
    resources: '',
    decisions: '',
    notes: ''
  }));

  return {
    overview: {
      name: 'Aria Thorn',
      tagline: 'A disciplined duelist.',
      ...overview
    },
    overviewRows: [['Name', 'Aria Thorn']],
    howToUse: '',
    progression,
    features: [],
    sections: {},
    sectionBlocks: {
      spellsAndResources: [],
      equipmentAndInventory: [],
      characterStory: [],
      sources: []
    },
    assetInputs: {}
  };
}
