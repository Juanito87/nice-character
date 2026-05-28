import { readFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

export type HomebreweryRendererConfig = {
  dockerMinVersion: string;
  homebreweryRepo: string;
  homebreweryCommit: string;
  imageName: string;
  renderer: 'v3';
  renderCommand: string[];
};

export type DockerRunOptions = {
  inputPath: string;
  outputPath: string;
  imageName: string;
  renderer: string;
  renderCommand: string[];
};

export type CommandRunner = (command: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

export async function readRendererConfig(path = 'homebrewery-renderer.json'): Promise<HomebreweryRendererConfig> {
  const config = JSON.parse(await readFile(path, 'utf8')) as HomebreweryRendererConfig;
  assertPinnedRendererConfig(config);
  return config;
}

export function assertPinnedRendererConfig(config: HomebreweryRendererConfig): void {
  if (!/^[0-9a-f]{40}$/i.test(config.homebreweryCommit)) {
    throw new Error('Homebrewery renderer config must pin a full 40-character commit SHA.');
  }
  if (!config.imageName.endsWith(`:${config.homebreweryCommit}`)) {
    throw new Error('Homebrewery renderer image tag must end with the pinned full commit SHA.');
  }
  if (config.imageName.endsWith(':latest')) {
    throw new Error('Homebrewery renderer image tag must not be floating: latest is not allowed.');
  }
  if (!/^\d+\.\d+\.\d+$/.test(config.dockerMinVersion)) {
    throw new Error('Docker minimum version must be an exact semantic version.');
  }
  if (config.renderer !== 'v3') {
    throw new Error('Only Homebrewery renderer v3 is supported.');
  }
  if (!Array.isArray(config.renderCommand) || config.renderCommand.length === 0) {
    throw new Error('Homebrewery renderer command must be configured.');
  }
}

export async function renderWithDocker(
  inputPath: string,
  outputPath: string,
  config: HomebreweryRendererConfig,
  runner: CommandRunner = runCommand
): Promise<void> {
  assertPinnedRendererConfig(config);
  await ensureDockerVersion(config.dockerMinVersion, runner);
  await ensureImageExists(config.imageName, runner);
  await runner('docker', buildDockerRunArgs({
    inputPath,
    outputPath,
    imageName: config.imageName,
    renderer: config.renderer,
    renderCommand: config.renderCommand
  }));
}

export function buildDockerRunArgs(options: DockerRunOptions): string[] {
  const inputDir = resolve(dirname(options.inputPath));
  const outputDir = resolve(dirname(options.outputPath));
  if (inputDir !== outputDir) {
    throw new Error('Homebrewery Docker rendering requires input and output files to share the same directory.');
  }

  return [
    'run',
    '--rm',
    '--network',
    'none',
    '--volume',
    `${inputDir}:/work`,
    options.imageName,
    ...options.renderCommand,
    '--input',
    `/work/${basename(options.inputPath)}`,
    '--output',
    `/work/${basename(options.outputPath)}`,
    '--renderer',
    options.renderer,
    '--overwrite'
  ];
}

export async function ensureDockerVersion(minVersion: string, runner: CommandRunner = runCommand): Promise<void> {
  let output: { stdout: string; stderr: string };
  try {
    output = await runner('docker', ['--version']);
  } catch {
    throw new Error('Docker is required for Homebrewery rendering, but docker is not available.');
  }

  const version = parseDockerVersion(`${output.stdout}\n${output.stderr}`);
  if (!version) {
    throw new Error('Could not determine Docker version from `docker --version`.');
  }
  if (compareVersions(version, minVersion) < 0) {
    throw new Error(`Docker ${minVersion} or newer is required for Homebrewery rendering. Found ${version}.`);
  }
}

async function ensureImageExists(imageName: string, runner: CommandRunner): Promise<void> {
  try {
    await runner('docker', ['image', 'inspect', imageName]);
  } catch {
    throw new Error(`Pinned Homebrewery Docker image is missing: ${imageName}. Run \`npm run homebrewery:image\` first.`);
  }
}

export function parseDockerVersion(output: string): string | undefined {
  return output.match(/Docker version (\d+\.\d+\.\d+)/)?.[1];
}

export function compareVersions(left: string, right: string): number {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

async function runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFile(command, args, { maxBuffer: 1024 * 1024 * 20 });
}
