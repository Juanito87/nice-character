import type { CharacterBook } from '../model/CharacterBook.js';

export type AssetProvider = {
  generateSummary(character: CharacterBook): Promise<string>;
  generateImagePrompt(character: CharacterBook): Promise<string>;
  generateStlPrompt(character: CharacterBook): Promise<string>;
};
