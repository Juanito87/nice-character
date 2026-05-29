import { MockAssetProvider } from '../src/ai/MockAssetProvider.js';

test('mock asset provider returns deterministic summary and prompt text', async () => {
  const provider = new MockAssetProvider();
  const character = {
    overview: { name: 'Aria Thorn', tagline: 'A disciplined duelist.' },
    overviewRows: [['Name', 'Aria Thorn'], ['Tagline', 'A disciplined duelist.']],
    howToUse: '',
    progression: [],
    features: [],
    sections: {},
    sectionBlocks: {
      spellsAndResources: [],
      equipmentAndInventory: [],
      characterStory: []
    },
    assetInputs: {}
  };

  await expect(provider.generateSummary(character)).resolves.toContain('Aria Thorn');
  await expect(provider.generateImagePrompt(character)).resolves.toContain('portrait');
  await expect(provider.generateStlPrompt(character)).resolves.toContain('miniature');
});
