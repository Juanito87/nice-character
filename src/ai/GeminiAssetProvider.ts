import type { AssetProvider } from './AssetProvider.js';
import type { CharacterBook } from '../model/CharacterBook.js';

type Fetch = typeof fetch;

export class GeminiAssetProvider implements AssetProvider {
  readonly name = 'gemini';
  private readonly apiKey: string;
  private readonly fetch: Fetch;
  private readonly textModel: string;
  private readonly imageModel: string;

  constructor(options: { apiKey: string; fetch?: Fetch; textModel?: string; imageModel?: string }) {
    this.apiKey = options.apiKey;
    this.fetch = options.fetch ?? fetch;
    this.textModel = options.textModel ?? 'gemini-2.5-flash';
    this.imageModel = options.imageModel ?? 'gemini-2.5-flash-image';
  }

  async generateSummary(character: CharacterBook): Promise<string> {
    return this.generateText(this.textModel, `Write a concise tabletop RPG character summary for ${character.overview.name}.`);
  }

  async generateDescription(character: CharacterBook): Promise<string> {
    return this.generateText(this.textModel, `Write a physical description for this tabletop RPG character: ${character.overview.name}.`);
  }

  async generateImagePrompt(character: CharacterBook): Promise<string> {
    return this.generateText(this.textModel, `Write a full-body fantasy character illustration prompt for ${character.overview.name}.`);
  }

  async generateIllustration(_character: CharacterBook, prompt: string): Promise<Buffer> {
    const json = await this.generateContent(this.imageModel, prompt);
    const image = json.candidates?.[0]?.content?.parts?.find((part: { inlineData?: { data?: string } }) => part.inlineData?.data)?.inlineData?.data;
    if (!image) {
      throw new Error('Gemini image generation response did not include image data.');
    }
    return Buffer.from(image, 'base64');
  }

  async generateStlPrompt(character: CharacterBook): Promise<string> {
    return this.generateText(this.textModel, `Write a tabletop miniature STL prompt for ${character.overview.name}.`);
  }

  private async generateText(model: string, prompt: string): Promise<string> {
    const json = await this.generateContent(model, prompt);
    const text = json.candidates?.[0]?.content?.parts?.find((part: { text?: string }) => part.text)?.text;
    if (!text) {
      throw new Error('Gemini response did not include text.');
    }
    return text.trim();
  }

  private async generateContent(model: string, prompt: string): Promise<any> {
    const response = await this.fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    if (!response.ok) {
      throw new Error(`Gemini request failed with status ${response.status}.`);
    }
    return response.json();
  }
}
