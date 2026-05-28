export type CharacterOverview = {
  name: string;
  pronouns?: string;
  ancestrySpecies?: string;
  classSubclassPath?: string;
  background?: string;
  player?: string;
  campaign?: string;
  tagline?: string;
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

export type CharacterBook = {
  overview: CharacterOverview;
  howToUse: string;
  progression: ProgressionLevel[];
  features: FeatureReference[];
  sections: Record<string, string>;
  assetInputs: AssetInputs;
};
