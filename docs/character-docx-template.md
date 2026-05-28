# Character DOCX Template

Create `characters/<character_name>/character.docx` with these heading names exactly.

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

Short player-facing notes for printing and using the book at the table.

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

Starting equipment, planned upgrades, magic items, currency, and campaign items.

## Character Story

Appearance, personality, ideals, bonds, flaws, backstory, allies, enemies, secrets, and campaign hooks.

## Asset Inputs

Use a two-column table:

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
