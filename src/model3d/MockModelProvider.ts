import type { GenerateModelOptions, ModelGenerationResult, ModelProvider } from './ModelProvider.js';

export class MockModelProvider implements ModelProvider {
  readonly name = 'mock';

  async generateModel(options: GenerateModelOptions): Promise<ModelGenerationResult> {
    return {
      provider: this.name,
      input: options.input,
      taskIds: ['mock-model-task'],
      primaryStlName: 'model.stl',
      consumedCredits: 0,
      files: [
        { name: 'model.stl', content: Buffer.from(`solid ${options.character.overview.name}\nendsolid\n`) },
        { name: 'model.glb', content: Buffer.from(`Mock GLB for ${options.character.overview.name}\n`) },
        { name: 'preview.png', content: Buffer.from(`Mock preview for ${options.character.overview.name}\n`) }
      ]
    };
  }
}
