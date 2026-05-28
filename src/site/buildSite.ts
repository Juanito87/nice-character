import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export type SiteCharacter = {
  slug: string;
  title: string;
  markdown: string;
};

export type BuildSiteOptions = {
  outDir: string;
  characters: SiteCharacter[];
  renderHomebreweryHtml: (character: SiteCharacter) => Promise<string>;
};

export async function buildSite(options: BuildSiteOptions): Promise<void> {
  await mkdir(options.outDir, { recursive: true });
  await writeFile(join(options.outDir, '.nojekyll'), '');
  await writeFile(join(options.outDir, 'index.html'), renderIndex(options.characters));

  for (const character of options.characters) {
    const characterOut = join(options.outDir, character.slug);
    const renderedHtml = await options.renderHomebreweryHtml(character);
    await mkdir(characterOut, { recursive: true });
    await writeFile(join(characterOut, 'index.html'), renderCharacterPage(character, renderedHtml));
    await writeFile(join(characterOut, `${character.slug}.brew.md`), character.markdown);
    await writeFile(join(characterOut, 'assets.json'), JSON.stringify({ slug: character.slug, assets: [] }, null, 2));
  }
}

function renderIndex(characters: SiteCharacter[]): string {
  const links = characters
    .map((character) => `<li><a href="./${escapeHtml(character.slug)}/">${escapeHtml(character.title)}</a></li>`)
    .join('\n');

  return pageShell('Nice Character', `<main><h1>Nice Character</h1><ul>${links}</ul></main>`);
}

function renderCharacterPage(character: SiteCharacter, renderedHtml: string): string {
  const sourceName = `${character.slug}.brew.md`;
  return pageShell(character.title, `
    <main class="brew-page">
      <nav class="actions">
        <button onclick="window.print()">Print Character Book</button>
        <a href="./${sourceName}" download>Download Homebrewery Source</a>
      </nav>
      <article class="rendered-brew">
        ${renderedHtml}
      </article>
      <details>
        <summary>Homebrewery source</summary>
        <pre class="brew-source">${escapeHtml(character.markdown)}</pre>
      </details>
    </main>
  `);
}

function pageShell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Georgia, serif; margin: 0; color: #241c15; background: #f7f2e8; }
    main { max-width: 960px; margin: 0 auto; padding: 32px 20px; }
    a, button { color: #6f251f; }
    .actions { display: flex; gap: 12px; align-items: center; margin-bottom: 24px; }
    .rendered-brew { background: #fffaf0; border: 1px solid #d6c5a8; padding: 24px; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #d6c5a8; padding: 6px 8px; vertical-align: top; }
    .brew-source { white-space: pre-wrap; background: #fffaf0; border: 1px solid #d6c5a8; padding: 20px; overflow-x: auto; }
    @media print {
      .actions, details { display: none; }
      body { background: white; }
      main { max-width: none; padding: 0; }
      .rendered-brew { border: 0; padding: 0; }
    }
  </style>
</head>
<body>
${body}
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
