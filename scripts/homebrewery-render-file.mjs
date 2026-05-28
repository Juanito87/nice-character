import { readFile, writeFile } from 'node:fs/promises';
import Markdown from '../shared/markdown.js';

const options = parseArgs(process.argv.slice(2));
const input = await readFile(options.input, 'utf8');
const css = await readOptionalCss();
const pages = input.split(/^\\page\s*$/gm);
const renderedPages = pages
  .map((page, index) => `<div class="page">${Markdown.render(page.trim(), index)}</div>`)
  .join('\n');

await writeFile(options.output, `<style>${css}</style>
<div class="brewRenderer rendererV3">
  <div class="pages">
    ${renderedPages}
  </div>
</div>
`);

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--input') parsed.input = args[index + 1];
    if (args[index] === '--output') parsed.output = args[index + 1];
  }
  if (!parsed.input || !parsed.output) {
    throw new Error('Usage: node scripts/nice-character-render.mjs --input <file> --output <file> --renderer v3 --overwrite');
  }
  return parsed;
}

async function readOptionalCss() {
  const candidates = [
    'build/themes/V3/Blank/style.css',
    'build/themes/V3/5ePHB/style.css'
  ];
  const css = [];
  for (const candidate of candidates) {
    try {
      css.push(await readFile(candidate, 'utf8'));
    } catch {
      // Try next generated theme asset.
    }
  }
  return css.join('\n');
}
