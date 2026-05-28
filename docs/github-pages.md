# GitHub Pages Deployment

This project publishes generated character books with GitHub Pages and GitHub Actions.

## Requirements

- The repository must be on GitHub.
- GitHub Actions must be enabled for the repository.
- GitHub Pages must be enabled for the repository.
- For GitHub Free personal or organization accounts, the repository must be public for GitHub Pages. Private repository Pages require a paid plan that supports Pages for private repositories.
- Do not store secrets or private character data in the generated site. GitHub Pages sites are publicly available once published.

## Pages Source

Use the current workflow mode:

1. Open the repository on GitHub.
2. Go to `Settings` -> `Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Push to `main` or run the `GitHub Pages` workflow manually.

The workflow builds the site into `dist/`, uploads `dist/` with `actions/upload-pages-artifact`, and deploys it with `actions/deploy-pages`.

If the Pages settings screen only offers `/root` or `/docs`, the repository is still in `Deploy from a branch` mode. That mode cannot select arbitrary generated folders such as `dist/`. Switch `Source` to `GitHub Actions`; the workflow artifact is the deployment source.

## Generated Path

For a project site, the default public URL is:

```text
https://<owner>.github.io/<repository>/
```

Each character is available below that path by character slug:

```text
https://<owner>.github.io/<repository>/<character-slug>/
```

For the included sample character:

```text
https://<owner>.github.io/<repository>/sample-character/
```

The generated Homebrewery source is available next to the character page:

```text
https://<owner>.github.io/<repository>/<character-slug>/<character-slug>.brew.md
```

## About `dist/`

`dist/` is the generated Pages artifact directory. In this repo's current deployment model, `dist/` must stay ignored and must not be committed.

GitHub Pages receives `dist/` from the workflow artifact, not from the repository tree. This keeps generated HTML out of source control and avoids committing large Homebrewery-rendered files.

Only commit `dist/` if the project intentionally switches away from GitHub Actions artifact deployment to branch/folder publishing. That would require a separate workflow and `.gitignore` change.
