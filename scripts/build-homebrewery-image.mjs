import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const config = JSON.parse(await readFile('homebrewery-renderer.json', 'utf8'));

assertPinnedConfig(config);

const sourceDir = join('.homebrewery-src', config.homebreweryCommit);
await mkdir(dirname(sourceDir), { recursive: true });

if (!existsSync(join(sourceDir, '.git'))) {
  await run('git', ['clone', config.homebreweryRepo, sourceDir]);
}

await run('git', ['fetch', 'origin', config.homebreweryCommit], { cwd: sourceDir });
await run('git', ['checkout', '--detach', config.homebreweryCommit], { cwd: sourceDir });
const { stdout } = await run('git', ['rev-parse', 'HEAD'], { cwd: sourceDir });
const actualCommit = stdout.trim();
if (actualCommit !== config.homebreweryCommit) {
  throw new Error(`Homebrewery checkout mismatch. Expected ${config.homebreweryCommit}, got ${actualCommit}.`);
}

if (!existsSync(join(sourceDir, 'config/docker.json'))) {
  await copyFile(join(sourceDir, 'config/default.json'), join(sourceDir, 'config/docker.json'));
}
await copyFile('scripts/homebrewery-render-file.mjs', join(sourceDir, 'scripts/nice-character-render.mjs'));

await run('docker', ['build', '--network', 'host', '--tag', config.imageName, sourceDir]);
console.log(`Built ${config.imageName} from ${config.homebreweryRepo}@${config.homebreweryCommit}`);

function assertPinnedConfig(value) {
  if (!/^[0-9a-f]{40}$/i.test(value.homebreweryCommit)) {
    throw new Error('homebreweryCommit must be a full 40-character commit SHA.');
  }
  if (!value.imageName.endsWith(`:${value.homebreweryCommit}`)) {
    throw new Error('imageName must be tagged with the full pinned commit SHA.');
  }
}

async function run(command, args, options = {}) {
  try {
    return await execFile(command, args, {
      ...options,
      maxBuffer: 1024 * 1024 * 20
    });
  } catch (error) {
    const stderr = error?.stderr ? `\n${error.stderr}` : '';
    const stdout = error?.stdout ? `\n${error.stdout}` : '';
    throw new Error(`Command failed: ${command} ${args.join(' ')}${stdout}${stderr}`);
  }
}
