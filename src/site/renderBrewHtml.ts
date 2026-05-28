export function renderBrewHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (line.startsWith('{{classTable')) {
      const tableLines: string[] = [];
      index += 1;
      while (index < lines.length && lines[index] !== '}}') {
        tableLines.push(lines[index] ?? '');
        index += 1;
      }
      html.push(renderTable(tableLines));
    } else if (line === '\\column') {
      html.push('<div class="column-break" aria-label="Column break"></div>');
    } else if (line === '\\page') {
      html.push('<hr class="page-break" aria-label="Page break">');
    } else if (line.startsWith('{{footnote ')) {
      html.push(`<footer class="footnote">${escapeHtml(line.slice('{{footnote '.length, -2))}</footer>`);
    } else if (line === '{{pageNumber,auto}}') {
      html.push('<span class="page-number">auto</span>');
    } else if (line.startsWith('### ')) {
      html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ')) {
      html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    } else if (line.trim()) {
      html.push(`<p>${renderInline(line)}</p>`);
    }
    index += 1;
  }

  return html.join('\n');
}

function renderTable(lines: string[]): string {
  const rows = lines.filter((line) => line.startsWith('|') && !line.includes(':--'));
  const renderedRows = rows.map((row, index) => {
    const cells = row.split('|').slice(1, -1).map((cell) => cell.trim());
    const tag = index === 0 ? 'th' : 'td';
    return `<tr>${cells.map((cell) => `<${tag}>${escapeHtml(cell)}</${tag}>`).join('')}</tr>`;
  });

  return `<table>\n${renderedRows.join('\n')}\n</table>`;
}

function renderInline(value: string): string {
  return escapeHtml(value).replace(/\*\*(.*?):\*\*/g, '<strong>$1:</strong>');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
