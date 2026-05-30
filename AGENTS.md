# AGENTS.md - Nice Character

## Project Contract

Nice Character converts structured D&D character DOCX files into Homebrewery markdown and a static site. Follow the existing parser and renderer tests before changing behavior.

## Character Inputs

- Character folders live under `characters/<name>/`.
- A folder may contain `character.docx` or exactly one non-lock `.docx` file.
- Do not mutate source DOCX files during AI workflows.
- Generated AI sidecars live under `characters/<name>/generated/`.
- Optional DOCX `AI Assets` controls are `run_ai`, `provider`, and `force`.
- Optional DOCX `3D Assets` controls are `stl`, `run_3d`, `provider`, `input`, and `force`.

## AI Workflow Rules

- Use `nice-character prepare-ai <character-folder-or-docx>` to create sidecar drafts.
- `prepare-ai characters` must respect DOCX opt-in by default; use `--run-ai` only for an explicit manual override.
- Manual DOCX content wins over generated content.
- Generated description path: `generated/description.md`.
- Generated image prompt path: `generated/image-prompt.md`.
- Generated illustration path: `generated/illustration.png`.
- Providers are `mock`, `openai`, and `gemini`. OpenAI uses `OPENAI_API_KEY`; Gemini uses `GEMINI_API_KEY`.
- Real AI providers must plug into the provider seam; do not hard-code provider calls into parser, renderer, or site code.

## 3D Workflow Rules

- Use `nice-character prepare-3d <character-folder-or-docx>` to create current 3D outputs.
- `prepare-3d characters` must respect DOCX opt-in by default; use `--run-3d` only for an explicit manual override.
- Manual DOCX STL paths or URLs win over generated STL output.
- Current generated 3D output path: `generated/3d/current/`.
- Current generated 3D manifest path: `generated/3d/current.json`.
- Artifact history path: `generated/history.md`; append it after commit using the actual commit SHA.
- Providers are `mock`, `meshy`, and `tripo`. Meshy uses `MESHY_API_KEY`; Tripo uses `TRIPO_API_KEY`.

## Verification

- Run focused Vitest tests for changed behavior.
- Run `npm run check` before reporting completion.
- Keep generated site output in `dist/` uncommitted.
