# AI Workflow

Nice Character supports optional AI sidecar generation without requiring paid API calls on every run. AI runs only when explicitly requested from the CLI or GitHub Actions, and each DOCX can opt in with its own `AI Assets` section.

## Generated Paths

Generated AI sidecars live under:

```text
characters/<name>/generated/
  description.md
  image-prompt.md
  illustration.png
  assets.json
```

The default command is:

```bash
nice-character prepare-ai "characters/<name>"
```

Use `--force` to overwrite existing generated sidecars.

For a characters root, the command scans folders and only processes DOCX files with `AI Assets` -> `run_ai` set to `true`:

```bash
nice-character prepare-ai characters --provider gemini
```

Use `--run-ai` only for a manual override that ignores the DOCX opt-in gate.

## DOCX AI Assets

Add an optional top-level `AI Assets` section with a two-column table:

| Field | Value |
| --- | --- |
| run_ai | false |
| provider | mock |
| force | false |

Fields:

- `run_ai`: `true` enables AI sidecar generation for this DOCX when the workflow AI phase is enabled.
- `provider`: `mock`, `openai`, or `gemini`.
- `force`: `true` allows overwriting existing generated sidecars for this DOCX.

## Precedence

Manual DOCX content wins:

- If the DOCX has a character description, `generated/description.md` is skipped unless `--force` is used.
- If the DOCX has `Illustration`, `Image`, or `Portrait`, generated image prompt and illustration files are skipped unless `--force` is used.
- If the DOCX omits illustration and `generated/illustration.png` exists, the renderer uses that generated path.

## Provider Seam

The default provider is deterministic `mock`. Real providers are selected with `--provider openai` or `--provider gemini`, or through the DOCX `AI Assets` provider field.

Provider secrets:

- `OPENAI_API_KEY` is required for `--provider openai`.
- `GEMINI_API_KEY` is required for `--provider gemini`.

The OpenAI integration uses the Responses API with image-generation tooling. The Gemini integration uses `generateContent` for text and inline image output. Tests use injected fetch functions and must not call live APIs.

Provider implementations must keep the provider seam boundaries:

- providers generate text or image artifacts
- parser reads DOCX structure
- renderer renders an already-resolved character book
- site build copies character-local generated assets

Do not mutate the original DOCX as part of the default AI flow.

## GitHub Actions

The Pages workflow has separate optional controls:

- `run_ai`: enables the AI phase for this manual workflow run.
- `ai_provider`: chooses `mock`, `openai`, or `gemini` for the run.
- `force_ai`: passes `--force` to overwrite generated sidecars.
- `publish_pages`: uploads and deploys the Pages artifact for the run.

Pages upload/deploy also runs when the repository variable `PUBLISH_PAGES` is set to `true`. Otherwise the workflow still builds and verifies the site, but skips the upload and deploy jobs.
