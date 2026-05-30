import { readFile } from 'node:fs/promises';

test('GitHub Actions workflow pins every action to a full commit SHA', async () => {
  const workflow = await readFile('.github/workflows/pages.yml', 'utf8');
  const usesLines = workflow
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- uses:') || line.startsWith('uses:'));

  expect(usesLines.length).toBeGreaterThan(0);
  for (const line of usesLines) {
    expect(line).toMatch(/@[0-9a-f]{40}(?:\s+# .+)?$/i);
    expect(line).not.toMatch(/@(v\d+|main|master|latest)(?:\s|$)/i);
  }
});

test('GitHub Actions installs the pinned Docker version required by Homebrewery rendering', async () => {
  const workflow = await readFile('.github/workflows/pages.yml', 'utf8');
  const rendererConfig = JSON.parse(await readFile('homebrewery-renderer.json', 'utf8')) as { dockerMinVersion: string };

  expect(workflow).toContain('docker/setup-docker-action@0234bb73ccb40f0c430b795634f9247e2b5c2d23');
  expect(workflow).toContain(`# v5.2.0`);
  expect(workflow).toContain(`version: v${rendererConfig.dockerMinVersion}`);
  expect(workflow.indexOf('docker/setup-docker-action')).toBeLessThan(workflow.indexOf('npm run homebrewery:image'));
});

test('GitHub Actions makes Pages deployment and AI generation optional', async () => {
  const workflow = await readFile('.github/workflows/pages.yml', 'utf8');

  expect(workflow).toContain('publish_pages');
  expect(workflow).toContain("vars.PUBLISH_PAGES == 'true'");
  expect(workflow).toContain('run_ai');
  expect(workflow).toContain("inputs.run_ai == 'true'");
  expect(workflow).toContain('ai_provider');
  expect(workflow).toContain('force_ai');
  expect(workflow).toContain('prepare-ai');
  expect(workflow).toContain('OPENAI_API_KEY');
  expect(workflow).toContain('GEMINI_API_KEY');
});

test('GitHub Actions makes paid 3D generation optional', async () => {
  const workflow = await readFile('.github/workflows/pages.yml', 'utf8');

  expect(workflow).toContain('run_3d');
  expect(workflow).toContain("inputs.run_3d == 'true'");
  expect(workflow).toContain('model_provider');
  expect(workflow).toContain('model_input');
  expect(workflow).toContain('force_3d');
  expect(workflow).toContain('prepare-3d');
  expect(workflow).toContain('MESHY_API_KEY');
  expect(workflow).toContain('TRIPO_API_KEY');
});
