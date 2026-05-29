# Character DOCX Template

Create `characters/<character_name>/character.docx` with these heading names exactly. `How To Use This Book` and `Asset Inputs` are optional.

## Character Overview

Use a two-column table:

| Field | Value |
| --- | --- |
| Name | Aria Thorn |
| Pronouns | she/her |
| Ancestry/Species | Human |
| Class/Subclass Path | Fighter / Battle Master |
| Background | Soldier |
| Player | Juan |
| Campaign | North Road |
| Tagline | A disciplined duelist looking for a lost banner. |

Do not add a `Level` row.

## How To Use This Book

Optional short player-facing notes for printing and using the book at the table. This section is parsed for compatibility but is not rendered in the generated Homebrewery book.

## Level Progression

Use a table with this header:

| Level | Proficiency Bonus | Features Gained | Subclass Features | Resources | Decisions | Notes |
| --- | --- | --- | --- | --- | --- | --- |

The table must include one row for each level from 1 to 20.

## Full Feature Reference

Use level-two headings for each feature:

```markdown
## Action Surge
Full feature text here.
```

Every feature named in Level Progression must appear here.

## Spells & Resources

Spellcasting rules, known/prepared spells, slots, resource trackers, and recharge rules.

## Equipment & Inventory

Use these subsection labels as standalone paragraphs. The converter renders them as subtitles:

```text
Starting gear
Wanted items
Utility items
Flavors items
```

Use `Item: <name>` as a standalone paragraph for item titles:

```text
Item: Bracers of Defense
Wondrous item, rare.
```

Equipment tables can be real DOCX tables or tab-separated rows. They render as framed tables, but not wide tables, because wide tables can break item flow in this section.

## Character Story

Appearance, personality, ideals, bonds, flaws, backstory, allies, enemies, secrets, and campaign hooks.

Standalone story paragraphs that do not end with a dot render as subtitles. For example, `The Quartermaster` becomes a subtitle, while `The Quartermaster.` remains normal prose.

## Asset Inputs

Optional. Use a two-column table:

| Field | Value |
| --- | --- |
| summary | manual/summary.md |
| imagePrompt | manual/image-prompt.md |
| stlPrompt | manual/stl-prompt.md |

Values can be pasted text or paths relative to the character folder.

## Generated Homebrewery Layout

The converter adds Homebrewery v3 layout controls to the generated `.brew.md`:

- `{{footnote ...}}` for section footer labels.
- `{{pageNumber,auto}}` for automatic page numbers.
- `\column` between paired sections that should share a printed page.
- `\page` between major printed sections.

Do not add those controls to the DOCX source unless you want them treated as normal text. They are generated before the Dockerized Homebrewery renderer runs.
