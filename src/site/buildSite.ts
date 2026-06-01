import { access, cp, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type SiteCharacter = {
  slug: string;
  title: string;
  markdown: string;
  localAssetsDir?: string;
  generatedAssetsDir?: string;
  stlDownload?: {
    href: string;
    label: string;
    copyFrom?: string;
  };
};

export type BuildSiteOptions = {
  outDir: string;
  homebreweryAssetsDir?: string;
  homebreweryFontsDir?: string;
  characters: SiteCharacter[];
  renderHomebreweryHtml: (character: SiteCharacter) => Promise<string>;
};

export async function buildSite(options: BuildSiteOptions): Promise<void> {
  await mkdir(options.outDir, { recursive: true });
  await writeFile(join(options.outDir, '.nojekyll'), '');
  await writeFile(join(options.outDir, 'index.html'), renderIndex(options.characters));
  if (options.homebreweryAssetsDir) {
    await cp(options.homebreweryAssetsDir, join(options.outDir, 'assets'), { recursive: true });
  }
  if (options.homebreweryFontsDir) {
    await cp(options.homebreweryFontsDir, join(options.outDir, 'fonts'), { recursive: true });
  }

  for (const character of options.characters) {
    const characterOut = join(options.outDir, character.slug);
    const renderedHtml = await options.renderHomebreweryHtml(character);
    await mkdir(characterOut, { recursive: true });
    if (character.localAssetsDir && await exists(character.localAssetsDir)) {
      await cp(character.localAssetsDir, join(characterOut, 'assets'), { recursive: true, force: true });
    }
    if (character.generatedAssetsDir && await exists(join(character.generatedAssetsDir, 'generated'))) {
      await cp(join(character.generatedAssetsDir, 'generated'), join(characterOut, 'generated'), { recursive: true, force: true });
    }
    if (character.stlDownload?.copyFrom) {
      await mkdir(dirname(join(characterOut, character.stlDownload.href)), { recursive: true });
      await cp(character.stlDownload.copyFrom, join(characterOut, character.stlDownload.href), { force: true });
    }
    await writeFile(join(characterOut, 'index.html'), renderCharacterPage(character, rewriteHomebreweryAssetUrls(renderedHtml)));
    await writeFile(join(characterOut, `${character.slug}.brew.md`), character.markdown);
    await writeFile(join(characterOut, 'assets.json'), JSON.stringify({ slug: character.slug, assets: [] }, null, 2));
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
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
  const stlDownload = character.stlDownload
    ? `<a href="${escapeHtml(localHref(character.stlDownload.href))}" download>${escapeHtml(character.stlDownload.label)}</a>`
    : '';
  return pageShell(character.title, `
    <main class="brew-page">
      <nav class="actions">
        <button onclick="window.print()">Print Character Book</button>
        <a href="./${sourceName}" download>Download Homebrewery Source</a>
        ${stlDownload}
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

function localHref(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return value.startsWith('./') ? value : `./${value}`;
}

function rewriteHomebreweryAssetUrls(html: string): string {
  return html
    .replaceAll("url('/assets/", "url('../assets/")
    .replaceAll('url("/assets/', 'url("../assets/')
    .replaceAll("url('/fonts/", "url('../fonts/")
    .replaceAll('url("/fonts/', 'url("../fonts/')
    .replaceAll("url('../../../fonts/", "url('../fonts/")
    .replaceAll('url("../../../fonts/', 'url("../fonts/')
    .replaceAll('src="/assets/', 'src="../assets/')
    .replaceAll("src='/assets/", "src='../assets/")
    .replaceAll('src="/fonts/', 'src="../fonts/')
    .replaceAll("src='/fonts/", "src='../fonts/");
}

function pageShell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Georgia, serif; margin: 0; color: #241c15; background: #2f4254; }
    main { max-width: 960px; margin: 0 auto; padding: 32px 20px; }
    a, button { color: #6f251f; }
    .actions { display: flex; gap: 12px; align-items: center; margin-bottom: 0; padding: 12px 20px; background: #f7f2e8; }
    .brew-page { max-width: none; padding: 0; }
    .rendered-brew { padding: 30px 0; overflow-x: auto; }
    .rendered-brew .brewRenderer { height: auto; padding-top: 0; overflow: visible; }
    .rendered-brew .pages > .page { margin-right: auto; margin-bottom: 30px; margin-left: auto; box-shadow: 1px 4px 14px #000000; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #d6c5a8; padding: 6px 8px; vertical-align: top; }
    .brew-source { white-space: pre-wrap; background: #fffaf0; border: 1px solid #d6c5a8; padding: 20px; overflow-x: auto; }
    @media print {
      .actions, details { display: none; }
      body { background: white; }
      main { max-width: none; padding: 0; }
      .rendered-brew { padding: 0; }
      .rendered-brew .pages > .page { box-shadow: none; }
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
