export type CharacterOverview = {
  name: string;
  pronouns?: string;
  ancestrySpecies?: string;
  classSubclassPath?: string;
  background?: string;
  player?: string;
  campaign?: string;
  tagline?: string;
  description?: string;
  illustration?: string;
  level?: never;
};

export type ProgressionLevel = {
  level: number;
  proficiencyBonus: string;
  featuresGained: string[];
  subclassFeatures: string[];
  resources: string;
  decisions: string;
  notes: string;
};

export type FeatureReference = {
  name: string;
  description: string;
};

export type AssetInputs = {
  summary?: string;
  imagePrompt?: string;
  stlPrompt?: string;
};

export type AiAssetProviderName = 'mock' | 'openai' | 'gemini';

export type AiAssets = {
  runAi?: boolean;
  provider?: AiAssetProviderName;
  force?: boolean;
};

export type ContentBlock =
  | {
      type: 'paragraph';
      text: string;
    }
  | {
      type: 'itemTitle';
      title: string;
    }
  | {
      type: 'subtitle';
      title: string;
    }
  | {
      type: 'table';
      rows: string[][];
    };

export type CharacterBook = {
  overview: CharacterOverview;
  overviewRows: string[][];
  levelOneStatsRows?: string[][];
  howToUse: string;
  progression: ProgressionLevel[];
  features: FeatureReference[];
  sections: Record<string, string>;
  sectionBlocks: {
    spellsAndResources: ContentBlock[];
    equipmentAndInventory: ContentBlock[];
    characterStory: ContentBlock[];
    sources: ContentBlock[];
  };
  assetInputs: AssetInputs;
  aiAssets?: AiAssets;
};
