import type { FetchLike } from './http.js';
import { delay, downloadFile, fileNameFromUrl, getJson, postJson } from './http.js';
import type { GenerateModelOptions, ModelGenerationFile, ModelGenerationResult, ModelProvider } from './ModelProvider.js';

export type TripoModelProviderOptions = {
  apiKey: string;
  fetch?: FetchLike;
  pollIntervalMs?: number;
  maxPolls?: number;
  modelVersion?: string;
};

export class TripoModelProvider implements ModelProvider {
  readonly name = 'tripo';
  private readonly apiKey: string;
  private readonly fetchFn: FetchLike;
  private readonly pollIntervalMs: number;
  private readonly maxPolls: number;
  private readonly modelVersion: string;
  private readonly baseUrl = 'https://api.tripo3d.ai/v2/openapi';

  constructor(options: TripoModelProviderOptions) {
    this.apiKey = options.apiKey;
    this.fetchFn = options.fetch ?? fetch;
    this.pollIntervalMs = options.pollIntervalMs ?? 5000;
    this.maxPolls = options.maxPolls ?? 120;
    this.modelVersion = options.modelVersion ?? 'H3';
  }

  async generateModel(options: GenerateModelOptions): Promise<ModelGenerationResult> {
    const modelTaskBody = options.input === 'image'
      ? {
          type: 'image_to_model',
          file: { type: 'image', url: requiredImageUrl(options.imageUrl) },
          model_version: this.modelVersion,
          texture: true
        }
      : {
          type: 'text_to_model',
          prompt: options.prompt,
          model_version: this.modelVersion,
          texture: true
        };

    const modelCreated = await postJson(this.fetchFn, `${this.baseUrl}/task`, this.apiKey, modelTaskBody);
    const modelTaskId = tripoTaskId(modelCreated);
    const modelTask = await this.poll(modelTaskId);

    const convertCreated = await postJson(this.fetchFn, `${this.baseUrl}/task`, this.apiKey, {
      type: 'convert_model',
      original_model_task_id: modelTaskId,
      format: 'STL'
    });
    const convertTaskId = tripoTaskId(convertCreated);
    const convertTask = await this.poll(convertTaskId);

    const files = [
      ...await this.downloadOutputFiles(modelTask, ['model', 'rendered_image']),
      ...await this.downloadOutputFiles(convertTask, ['model'])
    ];

    return {
      provider: this.name,
      input: options.input,
      taskIds: [modelTaskId, convertTaskId],
      files,
      primaryStlName: files.find((file) => file.name.toLowerCase().endsWith('.stl'))?.name,
      consumedCredits: credit(modelTask) + credit(convertTask),
      metadata: {
        rawModelTask: modelTask,
        rawConvertTask: convertTask
      }
    };
  }

  private async poll(taskId: string): Promise<Record<string, any>> {
    for (let attempt = 0; attempt < this.maxPolls; attempt += 1) {
      const response = await getJson(this.fetchFn, `${this.baseUrl}/task/${taskId}`, this.apiKey) as Record<string, any>;
      const task = response.data ?? response;
      const status = String(task.status ?? '').toLowerCase();
      if (status === 'success' || status === 'succeeded') {
        return task;
      }
      if (status === 'failed' || status === 'cancelled' || status === 'canceled') {
        throw new Error(`Tripo task failed: ${task.message ?? status}`);
      }
      await delay(this.pollIntervalMs);
    }
    throw new Error('Tripo task polling timed out');
  }

  private async downloadOutputFiles(task: Record<string, any>, keys: string[]): Promise<ModelGenerationFile[]> {
    const output = task.output ?? {};
    const files: ModelGenerationFile[] = [];
    for (const key of keys) {
      const url = output[key];
      if (typeof url === 'string' && url) {
        files.push({
          name: fileNameFromUrl(url, key === 'rendered_image' ? 'preview.png' : 'model.glb'),
          sourceUrl: url,
          content: await downloadFile(this.fetchFn, url)
        });
      }
    }
    return files;
  }
}

function tripoTaskId(response: unknown): string {
  const body = response as Record<string, any>;
  const id = body.data?.task_id ?? body.task_id;
  if (typeof id !== 'string' || !id) {
    throw new Error('Tripo response did not include a task id');
  }
  return id;
}

function requiredImageUrl(value?: string): string {
  if (!value) {
    throw new Error('Tripo image-to-model generation requires an image URL or data URI');
  }
  return value;
}

function credit(task: Record<string, any>): number {
  return typeof task.consumed_credit === 'number' ? task.consumed_credit : 0;
}
