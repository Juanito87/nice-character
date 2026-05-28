# Development Guide

This project supports normal host development, VS Code Dev Containers, and GitHub Codespaces. The Homebrewery renderer uses Docker, so the development environment must be able to build and run Docker images.

## Local Devcontainer

Prerequisites:

- Docker Desktop, Docker Engine, or another Docker-compatible daemon.
- VS Code with the Dev Containers extension, or another editor that supports `.devcontainer/devcontainer.json`.
- Enough disk space for Node dependencies and the pinned Homebrewery image.

Steps:

1. Open the repository in VS Code.
2. Run `Dev Containers: Reopen in Container`.
3. Wait for `postCreateCommand` to finish. It runs:

```bash
npm ci
```

4. Build the pinned Homebrewery image:

```bash
npm run homebrewery:image
```

5. Verify the development environment:

```bash
npm run check
```

6. Build the local site:

```bash
npm run site:build
```

7. Preview the generated site:

```bash
npm run site:serve
```

Open `http://localhost:8080`. The sample character should be available at `http://localhost:8080/sample-character/`.

The devcontainer uses Docker-outside-of-Docker and mounts the host Docker socket. This is intentional: it lets the container build and run the same pinned Homebrewery image used by CI. Treat the devcontainer as trusted local infrastructure because Docker socket access is broad.

## GitHub Codespaces

Steps:

1. Open the repository on GitHub.
2. Select `Code` -> `Codespaces` -> `Create codespace`.
3. Wait for the devcontainer setup to complete.
4. In the Codespaces terminal, install dependencies if they did not already install:

```bash
npm ci
```

5. Build the pinned Homebrewery image:

```bash
npm run homebrewery:image
```

6. Run verification:

```bash
npm run check
```

7. Build and preview the site:

```bash
npm run site:build
npm run site:serve
```

Codespaces will detect the forwarded port. Open the forwarded `8080` URL from the Ports panel. If the port is not forwarded automatically, add port `8080` manually and open it in the browser.

## GitHub Actions Docker Version

The Pages workflow installs Docker `v29.5.2` with a SHA-pinned `docker/setup-docker-action` step before building the Homebrewery image. This is required because GitHub-hosted runners may ship an older Docker version than the minimum in `homebrewery-renderer.json`.

## Pages Deployment

GitHub Pages deployment is documented in `docs/github-pages.md`. The important local-development detail is that `dist/` is generated output: build it locally to preview, but do not commit it while the repo uses GitHub Actions artifact deployment.

## Host Development Without Devcontainer

Prerequisites:

- Node.js compatible with this project.
- npm.
- Docker `29.5.2` or newer.

Setup:

```bash
npm ci
npm run homebrewery:image
npm run check
```

Local preview:

```bash
npm run site:build
npm run site:serve
```

Open `http://localhost:8080`.

## Common Issues

If `npm run homebrewery:image` fails with a network error, confirm Docker can reach GitHub and the npm registry. The command clones the pinned Homebrewery commit and builds a local Docker image.

If `npm run site:build` says the pinned Homebrewery image is missing, run:

```bash
npm run homebrewery:image
```

If `npm run site:serve` fails because port `8080` is already in use, serve the generated `dist/` folder manually on another port:

```bash
python3 -m http.server 8081 --directory dist
```
