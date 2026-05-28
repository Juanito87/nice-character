# Nice Character

This project is born because I wanted to automate a proces I've been doing with ai for character creation, and I wanted to have better versioning than keeping things on google drive. Also for testing <https://github.com/Xipher-Labs/walter-os> to improve on ai-workflows.
Nice Character converts structured D&D player-character `.docx` books into Homebrewery v3-style markdown and a print-friendly static site for GitHub Pages.

## Character Layout

Each character owns its data:

```text
characters/
  aria-thorn/
    character.docx
    manual/
      summary.md
      image-prompt.md
      stl-prompt.md
    assets/
assets/
dist/
```

Use `assets/` only for global shared files. Character-local files should stay inside `characters/<character_name>/`.

## DOCX Template

`character.docx` must use these top-level headings:

1. Character Overview
2. How To Use This Book
3. Level Progression
4. Full Feature Reference
5. Spells & Resources
6. Equipment & Inventory
7. Character Story
8. Asset Inputs

The overview must not include a current level. The book is a level 1-20 reference.

A working sample lives at `characters/sample-character/character.docx`. The matching editable source used to generate it is `characters/sample-character/sample-character-source.html`.

## Commands

```bash
npm install
npm run homebrewery:image
npm test
npm run build
npm run typecheck
```

After build:

```bash
node build/src/cli/index.js validate characters/sample-character
node build/src/cli/index.js convert characters/sample-character --out dist/sample-character
node build/src/cli/index.js build-site --input characters --out dist
```

For local preview:

```bash
npm run homebrewery:image
npm run site:build
npm run site:serve
```

Then open `http://localhost:8080`. The sample character page is at `http://localhost:8080/sample-character/`.

## Homebrewery Renderer Pinning

The site build renders generated `.brew.md` through Dockerized Homebrewery instead of the local approximation. The renderer is pinned in `homebrewery-renderer.json`:

- Docker minimum version: `29.5.2`
- Homebrewery commit: `077b88139a1df263307b180e1876a1ee454b5dad`
- Image tag: `nice-character/homebrewery-render:077b88139a1df263307b180e1876a1ee454b5dad`
- Renderer: `v3`

Build the pinned local image with:

```bash
npm run homebrewery:image
```

Then render the site with:

```bash
npm run site:build
```

Do not change the Homebrewery commit to a branch, short SHA, or floating tag. Update it only by pinning a new full 40-character commit SHA and rebuilding the image.

## Devcontainer

This repo includes `.devcontainer/devcontainer.json` for local development in VS Code Dev Containers or compatible tools.

The container uses Node 24 and Docker-outside-of-Docker, mounting the host Docker socket so the pinned Homebrewery image workflow works the same way inside and outside the container.

Local devcontainer quickstart:

```bash
npm run homebrewery:image
npm run check
npm run site:build
```

GitHub Codespaces uses the same devcontainer. After the codespace starts, run the same commands and open the forwarded `8080` port after `npm run site:serve`.

Docker access inside the container is intentionally broad because the project needs to build and run the pinned Homebrewery renderer image. Treat the devcontainer as trusted local development infrastructure.

See `docs/development.md` for local devcontainer, Codespaces, host development, and troubleshooting steps.

## CI Pinning

GitHub Actions in `.github/workflows/pages.yml` are pinned to full commit SHAs instead of floating tags. Keep the comment beside each SHA with the human-readable tag, but do not replace the SHA with `@v4`, `@main`, or similar floating refs.

Current pinned actions:

- `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683` (`v4.2.2`)
- `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020` (`v4.4.0`)
- `docker/setup-docker-action@0234bb73ccb40f0c430b795634f9247e2b5c2d23` (`v5.2.0`)
- `actions/upload-pages-artifact@56afc609e74202658d3ffba0e8f6dda462b719fa` (`v3.0.1`)
- `actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e` (`v4.0.5`)

The workflow installs Docker `v29.5.2` explicitly because GitHub-hosted runners can lag behind the renderer requirement in `homebrewery-renderer.json`.
