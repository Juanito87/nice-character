# Character Overview Description And Illustration

## Problem

The generated character overview currently shows only the facts table and optional level-one stats. Character books need room for a short visual description and, when available, a large illustration that is easy to appreciate on the overview page.

## Decisions

- Keep the existing `Character Overview` section as the source of truth.
- Accept optional overview table fields named `Description`, `Character Description`, `Illustration`, `Image`, or `Portrait`.
- Accept a standalone `Character description` paragraph block inside Character Overview, before `LV 1 stats`.
- Do not render description or illustration path fields in the facts table.
- Render the overview media area only when description or illustration is present.
- Put description in a narrower left column and the illustration in a larger right column.
- Preserve existing output when no description or illustration is provided.

## Acceptance Criteria

- A character with a `Description` field gets a `### Character Description` subsection in the generated overview.
- A character with a standalone `Character description` block gets the same generated subsection.
- A character with an `Illustration` field gets a large image block on the overview page.
- A character with both description and illustration gets a two-column overview media block where the image column is larger.
- Existing documents without those fields continue to render the current overview table and LV 1 stats.
