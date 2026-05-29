import { mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { dirname } from 'node:path';
import { finished } from 'node:stream/promises';
import archiver from 'archiver';

const outPath = "docs/Template pj's.docx";

await mkdir(dirname(outPath), { recursive: true });

const output = createWriteStream(outPath);
const archive = archiver('zip', { zlib: { level: 9 } });
archive.pipe(output);

archive.append(xml`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`, { name: '[Content_Types].xml' });

archive.append(xml`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`, { name: '_rels/.rels' });

archive.append(xml`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`, { name: 'word/_rels/document.xml.rels' });

archive.append(xml`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:uiPriority w:val="9"/>
    <w:qFormat/>
    <w:pPr><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
  </w:style>
</w:styles>`, { name: 'word/styles.xml' });

archive.append(documentXml(), { name: 'word/document.xml' });
await archive.finalize();
await finished(output);

console.log(`Wrote ${outPath}`);

function documentXml() {
  const body = [
    p('Character overview'),
    table([
      ['Name', '[Character Name]'],
      ['Pronouns', '[pronouns]'],
      ['Ancestry/Species', '[ancestry/species and origin choices]'],
      ['Class/Multiclass', '[class or multiclass path]'],
      ['Subclass', '[subclass]'],
      ['Background', '[background, proficiencies, bonuses, feat]'],
      ['Player', '[player name]'],
      ['Tagline', '[one-sentence character hook]'],
      ['Hit dice / HP', '[hit dice / level 1 HP and progression note]'],
      ['Armor', '[armor proficiencies]'],
      ['Weapons', '[weapon proficiencies]'],
      ['Tools', '[tool proficiencies]'],
      ['Saving throws', '[saving throw proficiencies]'],
      ['Skills', '[skill choices and source notes]']
    ]),
    p('Character description'),
    p('[Description paragraph 1: physical build, silhouette, and first impression.]'),
    p('[Description paragraph 2: face, hair, expression, clothing, gear, and distinctive visual details.]'),
    p('[Description paragraph 3: posture, presence, movement, and table-facing personality cues.]'),
    p('LV 1 stats'),
    table([
      ['Attribute', 'Ability score', 'Background Bonus', 'Total score', 'Ability Modifier'],
      ['STR', '[base]', '[bonus]', '[total]', '[modifier]'],
      ['DEX', '[base]', '[bonus]', '[total]', '[modifier]'],
      ['CON', '[base]', '[bonus]', '[total]', '[modifier]'],
      ['INT', '[base]', '[bonus]', '[total]', '[modifier]'],
      ['WIS', '[base]', '[bonus]', '[total]', '[modifier]'],
      ['CHA', '[base]', '[bonus]', '[total]', '[modifier]']
    ]),
    p('Level Progression'),
    table([
      ['Level', 'Proficiency Bonus', 'Features Gained', 'Subclass features', 'Resources', 'Decisions', 'Notes'],
      ...Array.from({ length: 20 }, (_, index) => {
        const level = String(index + 1).padStart(2, '0');
        return [level, `[+${2 + Math.floor((index + 1 - 1) / 4)}]`, `Feature ${index + 1}`, '', '[resource changes]', '[choices]', '[notes]'];
      })
    ]),
    p('Full Feature Reference'),
    ...Array.from({ length: 20 }, (_, index) => [
      p(`Feature ${index + 1}`),
      p(`[Complete description for Feature ${index + 1}. Replace this with the exact rules text or table-facing explanation.]`)
    ]).flat(),
    p('Spell & Resources'),
    p('[Spellcasting rules, prepared/known spells, slots, class resources, recharge rules, and tracking notes. Leave blank if none.]'),
    p('Equipment & Inventory'),
    p('Starting gear'),
    p('[Starting gear granted by class, background, and campaign choices.]'),
    p('Item: [Starting item name]'),
    p('[Starting item rules text, rarity, cost, attunement, and notes.]'),
    p('Wanted items'),
    p('[Items relevant to the build that should be discussed with the DM.]'),
    p('Item: [Wanted item name]'),
    p('[Wanted item rules text and why it matters.]'),
    p('Flavor items'),
    p('[Items that express the character concept without being required for the build.]'),
    p('Item: [Flavor item name]'),
    p('[Flavor item description.]'),
    table([
      ['Item', 'Benefit', 'Rarity'],
      ['[Table item]', '[mechanical or story benefit]', '[rarity]']
    ]),
    p('Utility items'),
    p('[Party utility, exploration tools, travel gear, storage, and contingency items.]'),
    p('Item: [Utility item name]'),
    p('[Utility item rules text.]'),
    p('Character Story'),
    p('[Story Title]'),
    p('[Opening story paragraph.]'),
    p('[Origin or early-life subtitle]'),
    p('[Origin paragraph.]'),
    p('[Reputation, allies, enemies, hooks, secrets, current status, and campaign-facing prompts.]'),
    p('AI Assets'),
    table([
      ['Field', 'Value'],
      ['run_ai', 'false'],
      ['provider', 'mock'],
      ['force', 'false']
    ]),
    p('Sources'),
    p('[Source name] [Link](https://example.com) - [What this source was used for.]'),
    table([
      ['Source', 'Link', 'Notes'],
      ['[Source name]', 'https://example.com', '[Usage notes]']
    ])
  ].join('\n');

  return xml`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function p(value) {
  return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p>`;
}

function table(rows) {
  return `<w:tbl>
    <w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>
    ${rows.map((row) => `<w:tr>${row.map((cell) => `<w:tc><w:p><w:r><w:t xml:space="preserve">${escapeXml(cell)}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`).join('\n')}
  </w:tbl>`;
}

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function xml(strings, ...values) {
  return String.raw({ raw: strings }, ...values).trim();
}
