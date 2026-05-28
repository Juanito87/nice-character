import type { AssetProvider } from './AssetProvider.js';
import type { CharacterBook } from '../model/CharacterBook.js';

export class MockAssetProvider implements AssetProvider {
  async generateSummary(character: CharacterBook): Promise<string> {
    return `${character.overview.name}: ${character.overview.tagline ?? 'character summary pending.'}`;
  }

  async generateImagePrompt(character: CharacterBook): Promise<string> {
    return `Full-body fantasy character portrait of ${character.overview.name}.`;
  }

  async generateStlPrompt(character: CharacterBook): Promise<string> {
    return `Tabletop miniature STL brief for ${character.overview.name}.`;
  }
}
