import type { AssetProvider } from './AssetProvider.js';
import type { CharacterBook } from '../model/CharacterBook.js';

export class MockAssetProvider implements AssetProvider {
  readonly name = 'mock';

  async generateSummary(character: CharacterBook): Promise<string> {
    return `${character.overview.name}: ${character.overview.tagline ?? 'character summary pending.'}`;
  }

  async generateDescription(character: CharacterBook): Promise<string> {
    return `${character.overview.name} is a tabletop fantasy character ready for a physical description draft.`;
  }

  async generateImagePrompt(character: CharacterBook): Promise<string> {
    return `Full-body fantasy character portrait of ${character.overview.name}.`;
  }

  async generateIllustration(character: CharacterBook): Promise<Buffer> {
    return Buffer.from(`Mock illustration placeholder for ${character.overview.name}\n`);
  }

  async generateStlPrompt(character: CharacterBook): Promise<string> {
    return `Tabletop miniature STL brief for ${character.overview.name}.`;
  }
}
