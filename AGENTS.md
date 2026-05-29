# AGENTS.md - Nice Character

## Project Contract

Nice Character converts structured D&D character DOCX files into Homebrewery markdown and a static site. Follow the existing parser and renderer tests before changing behavior.

## Character Inputs

- Character folders live under `characters/<name>/`.
- A folder may contain `character.docx` or exactly one non-lock `.docx` file.
- Do not mutate source DOCX files during AI workflows.
- Generated AI sidecars live under `characters/<name>/generated/`.
- Optional DOCX `AI Assets` controls are `run_ai`, `provider`, and `force`.

## AI Workflow Rules

- Use `nice-character prepare-ai <character-folder-or-docx>` to create sidecar drafts.
- `prepare-ai characters` must respect DOCX opt-in by default; use `--run-ai` only for an explicit manual override.
- Manual DOCX content wins over generated content.
- Generated description path: `generated/description.md`.
- Generated image prompt path: `generated/image-prompt.md`.
- Generated illustration path: `generated/illustration.png`.
- Providers are `mock`, `openai`, and `gemini`. OpenAI uses `OPENAI_API_KEY`; Gemini uses `GEMINI_API_KEY`.
- Real AI providers must plug into the provider seam; do not hard-code provider calls into parser, renderer, or site code.

## Verification

- Run focused Vitest tests for changed behavior.
- Run `npm run check` before reporting completion.
- Keep generated site output in `dist/` uncommitted.
