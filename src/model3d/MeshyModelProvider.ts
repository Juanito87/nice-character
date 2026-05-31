import type { CharacterBook } from '../model/CharacterBook.js';
import type { FetchLike } from './http.js';
import { delay, downloadFile, fileNameFromUrl, getJson, postJson } from './http.js';
import type { GenerateModelOptions, ModelGenerationFile, ModelGenerationResult, ModelProvider } from './ModelProvider.js';

export type MeshyModelProviderOptions = {
  apiKey: string;
  fetch?: FetchLike;
  pollIntervalMs?: number;
  maxPolls?: number;
};

export class MeshyModelProvider implements ModelProvider {
  readonly name = 'meshy';
  private readonly apiKey: string;
  private readonly fetchFn: FetchLike;
  private readonly pollIntervalMs: number;
  private readonly maxPolls: number;
  private readonly textBaseUrl = 'https://api.meshy.ai/openapi/v2/text-to-3d';
  private readonly imageBaseUrl = 'https://api.meshy.ai/openapi/v1/image-to-3d';

  constructor(options: MeshyModelProviderOptions) {
    this.apiKey = options.apiKey;
    this.fetchFn = options.fetch ?? fetch;
    this.pollIntervalMs = options.pollIntervalMs ?? 5000;
    this.maxPolls = options.maxPolls ?? 120;
  }

  async generateModel(options: GenerateModelOptions): Promise<ModelGenerationResult> {
    return options.input === 'image'
      ? await this.generateFromImage(options)
      : await this.generateFromText(options);
  }

  private async generateFromText(options: GenerateModelOptions): Promise<ModelGenerationResult> {
    const preview = await postJson(this.fetchFn, this.textBaseUrl, this.apiKey, {
      mode: 'preview',
      prompt: options.prompt,
      target_formats: ['glb', 'obj', 'fbx', 'stl', 'usdz', '3mf']
    });
    const previewId = taskId(preview);
    await this.poll(`${this.textBaseUrl}/${previewId}`);

    const refine = await postJson(this.fetchFn, this.textBaseUrl, this.apiKey, {
      mode: 'refine',
      preview_task_id: previewId,
      texture_prompt: options.prompt,
      target_formats: ['glb', 'obj', 'fbx', 'stl', 'usdz', '3mf']
    });
    const refineId = taskId(refine);
    const refineTask = await this.poll(`${this.textBaseUrl}/${refineId}`);
    return await this.resultFromTask(options.character, options.input, [previewId, refineId], refineTask);
  }

  private async generateFromImage(options: GenerateModelOptions): Promise<ModelGenerationResult> {
    if (!options.imageUrl) {
      throw new Error('Meshy image-to-3D generation requires an image URL or data URI');
    }

    const created = await postJson(this.fetchFn, this.imageBaseUrl, this.apiKey, {
      image_url: options.imageUrl,
      enable_pbr: true,
      target_formats: ['glb', 'obj', 'fbx', 'stl', 'usdz', '3mf']
    });
    const id = taskId(created);
    const task = await this.poll(`${this.imageBaseUrl}/${id}`);
    return await this.resultFromTask(options.character, options.input, [id], task);
  }

  private async poll(url: string): Promise<Record<string, any>> {
    for (let attempt = 0; attempt < this.maxPolls; attempt += 1) {
      const task = await getJson(this.fetchFn, url, this.apiKey) as Record<string, any>;
      const status = String(task.status ?? '').toUpperCase();
      if (status === 'SUCCEEDED' || status === 'SUCCESS') {
        return task;
      }
      if (status === 'FAILED' || status === 'CANCELED') {
        throw new Error(`Meshy task failed: ${task.task_error?.message ?? status}`);
      }
      await delay(this.pollIntervalMs);
    }
    throw new Error('Meshy task polling timed out');
  }

  private async resultFromTask(character: CharacterBook, input: 'text' | 'image', taskIds: string[], task: Record<string, any>): Promise<ModelGenerationResult> {
    const files: ModelGenerationFile[] = [];
    for (const [format, url] of Object.entries(task.model_urls ?? {})) {
      if (typeof url === 'string' && url) {
        files.push({
          name: fileNameFromUrl(url, `model.${format}`),
          sourceUrl: url,
          content: await downloadFile(this.fetchFn, url)
        });
      }
    }
    if (typeof task.thumbnail_url === 'string' && task.thumbnail_url) {
      files.push({
        name: fileNameFromUrl(task.thumbnail_url, 'preview.png'),
        sourceUrl: task.thumbnail_url,
        content: await downloadFile(this.fetchFn, task.thumbnail_url)
      });
    }
    for (const [index, texture] of Object.entries(task.texture_urls ?? [])) {
      if (texture && typeof texture === 'object') {
        for (const [kind, url] of Object.entries(texture)) {
          if (typeof url === 'string' && url) {
            files.push({
              name: `texture-${kind}-${index}.png`,
              sourceUrl: url,
              content: await downloadFile(this.fetchFn, url)
            });
          }
        }
      }
    }

    return {
      provider: this.name,
      input,
      taskIds,
      files,
      primaryStlName: files.find((file) => file.name.toLowerCase().endsWith('.stl'))?.name,
      consumedCredits: typeof task.consumed_credits === 'number' ? task.consumed_credits : undefined,
      metadata: {
        character: character.overview.name,
        rawTask: task
      }
    };
  }
}

function taskId(response: unknown): string {
  const body = response as Record<string, any>;
  const id = body.result ?? body.id;
  if (typeof id !== 'string' || !id) {
    throw new Error('Provider response did not include a task id');
  }
  return id;
}
