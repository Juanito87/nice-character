import type { CharacterBook, ModelAssetInput } from '../model/CharacterBook.js';

export type ModelGenerationFile = {
  name: string;
  content: Buffer;
  sourceUrl?: string;
};

export type ModelGenerationResult = {
  provider: string;
  input: ModelAssetInput;
  taskIds: string[];
  files: ModelGenerationFile[];
  primaryStlName?: string;
  consumedCredits?: number;
  metadata?: Record<string, unknown>;
};

export type GenerateModelOptions = {
  character: CharacterBook;
  prompt: string;
  input: ModelAssetInput;
  imageUrl?: string;
};

export type ModelProvider = {
  readonly name: string;
  generateModel(options: GenerateModelOptions): Promise<ModelGenerationResult>;
};
