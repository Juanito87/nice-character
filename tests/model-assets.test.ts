import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveModelAssets } from '../src/assets/resolveModelAssets.js';
import { MockModelProvider } from '../src/model3d/MockModelProvider.js';
import { MeshyModelProvider } from '../src/model3d/MeshyModelProvider.js';
import { TripoModelProvider } from '../src/model3d/TripoModelProvider.js';
import { prepareCharacter3dAssets } from '../src/model3d/prepareCharacter3dAssets.js';
import { recordArtifactHistory } from '../src/model3d/recordArtifactHistory.js';
import type { CharacterBook } from '../src/model/CharacterBook.js';

test('resolves local and external STL assets safely', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nice-character-model-assets-'));
  const characterDir = join(root, 'characters/aria-thorn');
  await mkdir(join(characterDir, 'assets'), { recursive: true });
  await writeFile(join(characterDir, 'assets/aria-thorn.stl'), 'solid aria');

  await expect(resolveModelAssets(characterDir, { stl: 'assets/aria-thorn.stl' })).resolves.toEqual({
    stl: {
      kind: 'local',
      source: 'assets/aria-thorn.stl',
      href: 'assets/aria-thorn.stl',
      copyFrom: join(characterDir, 'assets/aria-thorn.stl')
    }
  });

  await expect(resolveModelAssets(characterDir, { stl: 'https://example.com/aria.stl' })).resolves.toEqual({
    stl: {
      kind: 'external',
      source: 'https://example.com/aria.stl',
      href: 'https://example.com/aria.stl'
    }
  });

  await expect(resolveModelAssets(characterDir, { stl: '/tmp/aria.stl' })).rejects.toThrow(/relative/);
  await expect(resolveModelAssets(characterDir, { stl: '../aria.stl' })).rejects.toThrow(/escapes/);
});

test('prepares current 3D outputs and replaces stale files on rerun', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nice-character-model-gen-'));
  const characterDir = join(root, 'characters/aria-thorn');
  await mkdir(join(characterDir, 'generated/3d/current'), { recursive: true });
  await writeFile(join(characterDir, 'generated/3d/current/stale.obj'), 'old');

  const result = await prepareCharacter3dAssets({
    characterDir,
    docxPath: join(characterDir, 'character.docx'),
    character: minimalCharacter(),
    provider: new MockModelProvider(),
    input: 'text',
    force: true
  });

  const manifest = JSON.parse(await readFile(join(characterDir, 'generated/3d/current.json'), 'utf8')) as {
    provider: string;
    input: string;
    primaryStl: string;
    outputs: Array<{ path: string }>;
  };

  expect(result.created).toContain('generated/stl-prompt.md');
  expect(result.created).toContain('generated/3d/current/model.stl');
  expect(manifest.provider).toBe('mock');
  expect(manifest.input).toBe('text');
  expect(manifest.primaryStl).toBe('generated/3d/current/model.stl');
  expect(manifest.outputs.map((output) => output.path)).toContain('generated/3d/current/model.glb');
  await expect(readFile(join(characterDir, 'generated/3d/current/stale.obj'), 'utf8')).rejects.toThrow();
});

test('prepares image-to-3D with a data URI for local illustrations', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nice-character-model-image-'));
  const characterDir = join(root, 'characters/aria-thorn');
  await mkdir(join(characterDir, 'generated'), { recursive: true });
  await writeFile(join(characterDir, 'generated/illustration.png'), 'png-bytes');
  let imageUrl = '';

  await prepareCharacter3dAssets({
    characterDir,
    docxPath: join(characterDir, 'character.docx'),
    character: minimalCharacter(),
    provider: {
      name: 'mock-image',
      async generateModel(options) {
        imageUrl = options.imageUrl ?? '';
        return {
          provider: 'mock',
          input: options.input,
          taskIds: [],
          primaryStlName: 'model.stl',
          files: [{ name: 'model.stl', content: Buffer.from('solid aria') }]
        };
      }
    },
    input: 'image',
    force: true
  });

  expect(imageUrl).toMatch(/^data:image\/png;base64,/);
});

test('records artifact history after a commit is known', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nice-character-history-'));
  const characterDir = join(root, 'characters/aria-thorn');
  await mkdir(characterDir, { recursive: true });

  await recordArtifactHistory({
    characterDir,
    commit: 'abc1234',
    summary: 'Regenerated Meshy image-to-3D miniature.',
    provider: 'meshy',
    input: 'image',
    primaryStl: 'generated/3d/current/model.stl',
    date: '2026-05-30'
  });

  const history = await readFile(join(characterDir, 'generated/history.md'), 'utf8');
  expect(history).toContain('# Generated Artifact History');
  expect(history).toContain('abc1234');
  expect(history).toContain('meshy');
  expect(history).toContain('generated/3d/current/model.stl');
});

test('Meshy provider creates text preview, refines with texture, and downloads outputs', async () => {
  const calls: Array<{ url: string; body?: any }> = [];
  const provider = new MeshyModelProvider({
    apiKey: 'meshy-key',
    pollIntervalMs: 0,
    fetch: async (url, init) => {
      const parsedBody = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url: String(url), body: parsedBody });
      if (String(url).endsWith('/text-to-3d') && parsedBody?.mode === 'preview') {
        return jsonResponse({ result: 'preview-task' });
      }
      if (String(url).endsWith('/text-to-3d/preview-task')) {
        return jsonResponse({ id: 'preview-task', status: 'SUCCEEDED' });
      }
      if (String(url).endsWith('/text-to-3d') && parsedBody?.mode === 'refine') {
        return jsonResponse({ result: 'refine-task' });
      }
      if (String(url).endsWith('/text-to-3d/refine-task')) {
        return jsonResponse({
          id: 'refine-task',
          status: 'SUCCEEDED',
          model_urls: {
            stl: 'https://assets.meshy.ai/model.stl',
            glb: 'https://assets.meshy.ai/model.glb'
          },
          thumbnail_url: 'https://assets.meshy.ai/preview.png',
          texture_urls: [{ base_color: 'https://assets.meshy.ai/texture.png' }],
          consumed_credits: 40
        });
      }
      return fileResponse(`file:${url}`);
    }
  });

  const result = await provider.generateModel({
    character: minimalCharacter(),
    prompt: 'heroic 28mm miniature',
    input: 'text'
  });

  expect(calls[0]?.body).toMatchObject({ mode: 'preview', prompt: 'heroic 28mm miniature' });
  expect(calls.some((call) => call.body?.mode === 'refine' && call.body?.preview_task_id === 'preview-task')).toBe(true);
  expect(result.taskIds).toEqual(['preview-task', 'refine-task']);
  expect(result.files.map((file) => file.name).sort()).toEqual(['model.glb', 'model.stl', 'preview.png', 'texture-base_color-0.png']);
  expect(result.primaryStlName).toBe('model.stl');
  expect(result.consumedCredits).toBe(40);
});

test('Tripo provider submits text model, converts to STL, and downloads native and STL outputs', async () => {
  const calls: Array<{ url: string; body?: any }> = [];
  const provider = new TripoModelProvider({
    apiKey: 'tripo-key',
    pollIntervalMs: 0,
    fetch: async (url, init) => {
      const parsedBody = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url: String(url), body: parsedBody });
      if (String(url).endsWith('/task') && parsedBody?.type === 'text_to_model') {
        return jsonResponse({ code: 0, data: { task_id: 'model-task' } });
      }
      if (String(url).endsWith('/task/model-task')) {
        return jsonResponse({
          code: 0,
          data: {
            task_id: 'model-task',
            status: 'success',
            output: {
              model: 'https://tripo3d.ai/model.glb',
              rendered_image: 'https://tripo3d.ai/preview.png'
            },
            consumed_credit: 20
          }
        });
      }
      if (String(url).endsWith('/task') && parsedBody?.type === 'convert_model') {
        return jsonResponse({ code: 0, data: { task_id: 'stl-task' } });
      }
      if (String(url).endsWith('/task/stl-task')) {
        return jsonResponse({
          code: 0,
          data: {
            task_id: 'stl-task',
            status: 'success',
            output: { model: 'https://tripo3d.ai/model.stl' },
            consumed_credit: 5
          }
        });
      }
      return fileResponse(`file:${url}`);
    }
  });

  const result = await provider.generateModel({
    character: minimalCharacter(),
    prompt: 'heroic 28mm miniature',
    input: 'text'
  });

  expect(calls[0]?.body).toMatchObject({ type: 'text_to_model', prompt: 'heroic 28mm miniature' });
  expect(calls.some((call) => call.body?.type === 'convert_model' && call.body?.format === 'STL')).toBe(true);
  expect(result.taskIds).toEqual(['model-task', 'stl-task']);
  expect(result.files.map((file) => file.name).sort()).toEqual(['model.glb', 'model.stl', 'preview.png']);
  expect(result.primaryStlName).toBe('model.stl');
  expect(result.consumedCredits).toBe(25);
});

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    json: async () => payload
  } as Response;
}

function fileResponse(value: string): Response {
  return {
    ok: true,
    arrayBuffer: async () => Buffer.from(value)
  } as unknown as Response;
}

function minimalCharacter(): CharacterBook {
  return {
    overview: {
      name: 'Aria Thorn',
      tagline: 'A disciplined duelist.',
      illustration: 'generated/illustration.png'
    },
    overviewRows: [['Name', 'Aria Thorn']],
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
    assetInputs: {
      stlPrompt: 'Heroic 28mm miniature with sturdy contact points.'
    }
  };
}
