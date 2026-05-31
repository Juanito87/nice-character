import type { ModelAssetProviderName } from '../model/CharacterBook.js';
import type { ModelProvider } from './ModelProvider.js';
import { MeshyModelProvider } from './MeshyModelProvider.js';
import { MockModelProvider } from './MockModelProvider.js';
import { TripoModelProvider } from './TripoModelProvider.js';

export type CreateModelProviderOptions = {
  provider: ModelAssetProviderName;
  apiKey?: string;
};

export function createModelProvider(options: CreateModelProviderOptions): ModelProvider {
  if (options.provider === 'mock') {
    return new MockModelProvider();
  }
  if (options.provider === 'meshy') {
    const apiKey = options.apiKey ?? process.env.MESHY_API_KEY;
    if (!apiKey) {
      throw new Error('MESHY_API_KEY is required for the Meshy 3D provider');
    }
    return new MeshyModelProvider({ apiKey });
  }
  if (options.provider === 'tripo') {
    const apiKey = options.apiKey ?? process.env.TRIPO_API_KEY;
    if (!apiKey) {
      throw new Error('TRIPO_API_KEY is required for the Tripo 3D provider');
    }
    return new TripoModelProvider({ apiKey });
  }

  throw new Error(`Unsupported 3D provider: ${options.provider}`);
}
