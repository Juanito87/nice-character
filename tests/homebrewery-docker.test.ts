import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  assertPinnedRendererConfig,
  buildDockerRunArgs,
  compareVersions,
  parseDockerVersion
} from '../src/homebrewery/renderWithDocker.js';

test('accepts a renderer config pinned to a full Homebrewery commit SHA', () => {
  expect(() => assertPinnedRendererConfig({
    dockerMinVersion: '29.5.2',
    homebreweryRepo: 'https://github.com/naturalcrit/homebrewery.git',
    homebreweryCommit: '077b88139a1df263307b180e1876a1ee454b5dad',
    imageName: 'nice-character/homebrewery-render:077b88139a1df263307b180e1876a1ee454b5dad',
    renderer: 'v3',
    renderCommand: ['node', 'scripts/nice-character-render.mjs']
  })).not.toThrow();
});

test('rejects floating Homebrewery renderer pins', () => {
  expect(() => assertPinnedRendererConfig({
    dockerMinVersion: '29.5.2',
    homebreweryRepo: 'https://github.com/naturalcrit/homebrewery.git',
    homebreweryCommit: 'master',
    imageName: 'nice-character/homebrewery-render:latest',
    renderer: 'v3',
    renderCommand: ['node', 'scripts/nice-character-render.mjs']
  })).toThrow(/full 40-character commit SHA/i);
});

test('builds Docker run args for the pinned Homebrewery v3 renderer', () => {
  const args = buildDockerRunArgs({
    inputPath: join('/tmp/render', 'sample.brew.md'),
    outputPath: join('/tmp/render', 'sample.html'),
    imageName: 'nice-character/homebrewery-render:077b88139a1df263307b180e1876a1ee454b5dad',
    renderer: 'v3',
    renderCommand: ['node', 'scripts/nice-character-render.mjs']
  });

  expect(args).toEqual([
    'run',
    '--rm',
    '--network',
    'none',
    '--volume',
    '/tmp/render:/work',
    'nice-character/homebrewery-render:077b88139a1df263307b180e1876a1ee454b5dad',
    'node',
    'scripts/nice-character-render.mjs',
    '--input',
    '/work/sample.brew.md',
    '--output',
    '/work/sample.html',
    '--renderer',
    'v3',
    '--overwrite'
  ]);
});

test('parses and compares Docker versions', () => {
  expect(parseDockerVersion('Docker version 29.5.2, build 79eb04c')).toBe('29.5.2');
  expect(compareVersions('29.5.2', '29.5.2')).toBe(0);
  expect(compareVersions('30.0.0', '29.5.2')).toBeGreaterThan(0);
  expect(compareVersions('29.4.0', '29.5.2')).toBeLessThan(0);
});

test('renderer script includes Homebrewery base and 5ePHB presentation layers', async () => {
  const script = await readFile('scripts/homebrewery-render-file.mjs', 'utf8');

  expect(script).toContain('build/themes/V3/Blank/style.css');
  expect(script).toContain('build/themes/V3/5ePHB/style.css');
  expect(script).toContain('<div class="pages">');
});
