import type { CharacterBook } from '../model/CharacterBook.js';

export type AssetProvider = {
  generateSummary(character: CharacterBook): Promise<string>;
  generateDescription(character: CharacterBook): Promise<string>;
  generateImagePrompt(character: CharacterBook): Promise<string>;
  generateIllustration(character: CharacterBook, prompt: string): Promise<Buffer>;
  generateStlPrompt(character: CharacterBook): Promise<string>;
};
