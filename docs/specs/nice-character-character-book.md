# Nice Character Character-Book Automation

## Goal

Convert structured `.docx` player-character books into Homebrewery v3-style markdown and a GitHub Pages static site.

## Decisions

- V1 supports player characters only.
- The book represents level 1-20 progression, not a current-level snapshot.
- Character Overview must not include a current level field.
- Each character lives under `characters/<character_name>/`.
- Character-local data is preferred over global data.
- Shared assets live under top-level `assets/`.
- The source `.docx` must provide all rules/progression/feature text.
- AI hooks are interfaces in v1; manual and path-based inputs are the default.
- Print support is Docker-rendered Homebrewery HTML plus downloadable Homebrewery source, not automated PDF generation.
- GitHub Actions are pinned by full commit SHA, with tags kept only as comments.
- Local development supports the Docker-backed render flow through the devcontainer.

## DOCX Contract

Required top-level headings:

- Character Overview
- Level Progression
- Full Feature Reference
- Spells & Resources
- Equipment & Inventory
- Character Story

Optional top-level headings:

- How To Use This Book
- Asset Inputs

`Level Progression` must contain all levels from 1 through 20. Every feature named in progression must have a corresponding full description in `Full Feature Reference`.

`Equipment & Inventory` supports standalone subtitles for `Starting gear`, `Wanted items`, `Utility items`, and `Flavors items`. `Item: <name>` marks item headings. Equipment tables render as framed non-wide tables.

`Character Story` treats standalone paragraphs that do not end with a dot as subtitles.

## Acceptance Criteria

- Validate a structured character folder.
- Convert `character.docx` to `<slug>.brew.md`.
- Build a static site with an index, per-character Homebrewery-rendered pages, print CSS, and downloadable Homebrewery source.
- Resolve manual summary, image prompt, and STL prompt files relative to the character folder.
- Keep AI providers behind a small interface with deterministic mock coverage.
