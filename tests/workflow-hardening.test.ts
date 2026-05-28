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
