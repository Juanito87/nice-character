import { mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { dirname } from 'node:path';
import { finished } from 'node:stream/promises';
import archiver from 'archiver';

const outPath = 'characters/sample-character/character.docx';

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
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:uiPriority w:val="9"/>
    <w:qFormat/>
    <w:pPr><w:outlineLvl w:val="1"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="26"/></w:rPr>
  </w:style>
</w:styles>`, { name: 'word/styles.xml' });

archive.append(documentXml(), { name: 'word/document.xml' });
await archive.finalize();
await finished(output);

console.log(`Wrote ${outPath}`);

function documentXml() {
  const body = [
    h1('Character Overview'),
    table([
      ['Name', 'Aria Thorn'],
      ['Pronouns', 'she/her'],
      ['Ancestry/Species', 'Human'],
      ['Class/Subclass Path', 'Fighter / Battle Master'],
      ['Background', 'Soldier'],
      ['Player', 'Sample Player'],
      ['Campaign', 'North Road'],
      ['Tagline', 'A disciplined duelist looking for a lost banner.']
    ]),
    h1('How To Use This Book'),
    p('Print the full book and mark each level when gained. Use the progression table to see what changes at each level, then use the feature reference when a rule or ability needs the full text at the table.'),
    h1('Level Progression'),
    table([
      ['Level', 'Proficiency Bonus', 'Features Gained', 'Subclass Features', 'Resources', 'Decisions', 'Notes'],
      ['1', '+2', 'Fighting Style, Second Wind', '', 'Second Wind 1/rest', 'Choose Defense', 'Front line baseline.'],
      ['2', '+2', 'Action Surge', '', 'Action Surge 1/rest', '', 'Use for decisive rounds.'],
      ['3', '+2', '', 'Combat Superiority', '4 superiority dice', 'Choose maneuvers', 'Subclass begins.'],
      ['4', '+2', 'Ability Score Improvement', '', '', 'Increase Strength', ''],
      ['5', '+3', 'Extra Attack', '', '', '', 'Damage output improves.'],
      ['6', '+3', 'Ability Score Improvement', '', '', 'Take feat', ''],
      ['7', '+3', '', 'Know Your Enemy', '', '', 'Useful before duels.'],
      ['8', '+3', 'Ability Score Improvement', '', '', 'Increase Constitution', ''],
      ['9', '+4', 'Indomitable', '', 'Indomitable 1/rest', '', ''],
      ['10', '+4', '', 'Improved Combat Superiority', 'd10 superiority dice', '', ''],
      ['11', '+4', 'Extra Attack (2)', '', '', '', 'Three attacks.'],
      ['12', '+4', 'Ability Score Improvement', '', '', 'Take feat', ''],
      ['13', '+5', 'Indomitable (2)', '', 'Indomitable 2/rest', '', ''],
      ['14', '+5', 'Ability Score Improvement', '', '', 'Increase Dexterity', ''],
      ['15', '+5', '', 'Relentless', '', '', ''],
      ['16', '+5', 'Ability Score Improvement', '', '', 'Take feat', ''],
      ['17', '+6', 'Action Surge (2), Indomitable (3)', '', 'Action Surge 2/rest', '', ''],
      ['18', '+6', '', 'Improved Combat Superiority (2)', 'd12 superiority dice', '', ''],
      ['19', '+6', 'Ability Score Improvement', '', '', 'Increase Wisdom', ''],
      ['20', '+6', 'Extra Attack (3)', '', '', '', 'Four attacks.']
    ]),
    h1('Full Feature Reference'),
    feature('Fighting Style', 'You adopt a particular style of fighting as your specialty. This sample keeps the full text short; replace it with the complete wording you want in the printed book.'),
    feature('Second Wind', 'You have a limited well of stamina that you can draw on to protect yourself during a fight.'),
    feature('Action Surge', 'You can push yourself beyond your normal limits for a moment and take an additional action.'),
    feature('Combat Superiority', 'You learn maneuvers fueled by superiority dice. Record the chosen maneuvers and their complete text here.'),
    feature('Ability Score Improvement', 'You can increase ability scores or choose a feat, depending on the rules used by the campaign.'),
    feature('Extra Attack', 'You can attack more than once when taking the Attack action on your turn.'),
    feature('Know Your Enemy', 'You can study another creature and learn information about its capabilities.'),
    feature('Indomitable', 'You can reroll a saving throw that you fail.'),
    feature('Improved Combat Superiority', 'Your superiority dice become stronger.'),
    feature('Extra Attack (2)', 'You can attack three times when taking the Attack action on your turn.'),
    feature('Indomitable (2)', 'You can use Indomitable twice between rests.'),
    feature('Relentless', 'You regain a superiority die when initiative starts and you have none remaining.'),
    feature('Action Surge (2)', 'You can use Action Surge twice between rests, but only once on the same turn.'),
    feature('Indomitable (3)', 'You can use Indomitable three times between rests.'),
    feature('Improved Combat Superiority (2)', 'Your superiority dice increase again for the highest-tier play.'),
    feature('Extra Attack (3)', 'You can attack four times when taking the Attack action on your turn.'),
    h1('Spells & Resources'),
    p('No spells. Track Second Wind, Action Surge, Indomitable, and superiority dice here. Replace this section with spellcasting details for spellcasters.'),
    h1('Equipment & Inventory'),
    p('Longsword, shield, chain mail, explorer pack, folded company banner, and campaign-specific keepsakes.'),
    h1('Character Story'),
    p('Aria searches for the banner lost by her old company. Her story section can include appearance, personality, ideals, bonds, flaws, allies, enemies, secrets, and campaign hooks.'),
    h1('Asset Inputs'),
    table([
      ['summary', 'manual/summary.md'],
      ['imagePrompt', 'manual/image-prompt.md'],
      ['stlPrompt', 'manual/stl-prompt.md']
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

function feature(name, description) {
  return `${h2(name)}\n${p(description)}`;
}

function h1(value) {
  return paragraph(value, 'Heading1');
}

function h2(value) {
  return paragraph(value, 'Heading2');
}

function p(value) {
  return paragraph(value);
}

function paragraph(value, style) {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : '';
  return `<w:p>${styleXml}<w:r><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p>`;
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
