import { GeminiAssetProvider } from './GeminiAssetProvider.js';
import { MockAssetProvider } from './MockAssetProvider.js';
import { OpenAiAssetProvider } from './OpenAiAssetProvider.js';
import type { AssetProvider } from './AssetProvider.js';
import type { AiAssetProviderName } from '../model/CharacterBook.js';

export type CreateAssetProviderOptions = {
  provider: AiAssetProviderName;
  apiKey?: string;
};

export function createAssetProvider(options: CreateAssetProviderOptions): AssetProvider & { name?: string } {
  if (options.provider === 'mock') {
    return new MockAssetProvider();
  }

  if (options.provider === 'openai') {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required when provider is openai.');
    }
    return new OpenAiAssetProvider({ apiKey });
  }

  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required when provider is gemini.');
  }
  return new GeminiAssetProvider({ apiKey });
}
