import { readFile } from 'node:fs/promises';

test('repo has AI-friendly agent instructions and workflow docs', async () => {
  const agents = await readFile('AGENTS.md', 'utf8');
  const workflow = await readFile('docs/ai-workflow.md', 'utf8');

  expect(agents).toContain('prepare-ai');
  expect(agents).toContain('generated/description.md');
  expect(agents).toContain('Do not mutate source DOCX files');
  expect(workflow).toContain('characters/<name>/generated/');
  expect(workflow).toContain('generated/illustration.png');
  expect(workflow).toContain('provider seam');
  expect(workflow).toContain('AI Assets');
  expect(workflow).toContain('OPENAI_API_KEY');
  expect(workflow).toContain('GEMINI_API_KEY');
  expect(workflow).toContain('3D Assets');
  expect(workflow).toContain('generated/3d/current/');
  expect(workflow).toContain('generated/history.md');
  expect(workflow).toContain('MESHY_API_KEY');
  expect(workflow).toContain('TRIPO_API_KEY');
});
