import type { AssetProvider } from './AssetProvider.js';
import type { CharacterBook } from '../model/CharacterBook.js';

type Fetch = typeof fetch;

export class OpenAiAssetProvider implements AssetProvider {
  readonly name = 'openai';
  private readonly apiKey: string;
  private readonly fetch: Fetch;
  private readonly textModel: string;
  private readonly imageModel: string;

  constructor(options: { apiKey: string; fetch?: Fetch; textModel?: string; imageModel?: string }) {
    this.apiKey = options.apiKey;
    this.fetch = options.fetch ?? fetch;
    this.textModel = options.textModel ?? 'gpt-5';
    this.imageModel = options.imageModel ?? 'gpt-5';
  }

  async generateSummary(character: CharacterBook): Promise<string> {
    return this.generateText(`Write a concise tabletop RPG character summary for ${character.overview.name}.`);
  }

  async generateDescription(character: CharacterBook): Promise<string> {
    return this.generateText(`Write a physical description for this tabletop RPG character: ${character.overview.name}. Use the overview, story, equipment, and class details.`);
  }

  async generateImagePrompt(character: CharacterBook): Promise<string> {
    return this.generateText(`Write a full-body fantasy character illustration prompt for ${character.overview.name}.`);
  }

  async generateIllustration(_character: CharacterBook, prompt: string): Promise<Buffer> {
    const json = await this.postResponses({
      model: this.imageModel,
      input: prompt,
      tools: [{ type: 'image_generation' }]
    });
    const image = json.output?.find((output: { type?: string }) => output.type === 'image_generation_call')?.result;
    if (!image) {
      throw new Error('OpenAI image generation response did not include image data.');
    }
    return Buffer.from(image, 'base64');
  }

  async generateStlPrompt(character: CharacterBook): Promise<string> {
    return this.generateText(`Write a tabletop miniature STL prompt for ${character.overview.name}.`);
  }

  private async generateText(input: string): Promise<string> {
    const json = await this.postResponses({ model: this.textModel, input });
    const text = json.output_text;
    if (!text) {
      throw new Error('OpenAI response did not include output_text.');
    }
    return text.trim();
  }

  private async postResponses(body: unknown): Promise<any> {
    const response = await this.fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}.`);
    }
    return response.json();
  }
}
