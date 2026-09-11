// Core static data definitions for Civdle: skills, resources, ages, and shop upgrades.

export type ResourceId =
  | "food"
  | "plantFibres"
  | "clay"
  | "wood"
  | "logs"
  | "stone"
  | "rawHides"
  | "rawFish"
  | "copperOre"
  | "ironOre"
  | "coal"
  | "tools"
  | "cordage"
  | "baskets"
  | "potteryVessel"
  | "preparedHides"
  | "clothing"
  | "cookedFish"
  | "preparedMeal"
  | "copperBar"
  | "ironBar"
  | "steelBar";

export const RESOURCES: Record<ResourceId, { name: string }> = {
  food: { name: "Food" },
  plantFibres: { name: "Plant Fibres" },
  clay: { name: "Clay" },
  wood: { name: "Wood" },
  logs: { name: "Logs" },
  stone: { name: "Stone" },
  rawHides: { name: "Raw Hides" },
  rawFish: { name: "Raw Fish" },
  copperOre: { name: "Copper Ore" },
  ironOre: { name: "Iron Ore" },
  coal: { name: "Coal" },
  tools: { name: "Tools" },
  cordage: { name: "Cordage" },
  baskets: { name: "Baskets" },
  potteryVessel: { name: "Pottery Vessel" },
  preparedHides: { name: "Prepared Hides" },
  clothing: { name: "Clothing" },
  cookedFish: { name: "Cooked Fish" },
  preparedMeal: { name: "Prepared Meal" },
  copperBar: { name: "Copper Bar" },
  ironBar: { name: "Iron Bar" },
  steelBar: { name: "Steel Bar" },
};

export type SkillId =
  | "foraging"
  | "woodcutting"
  | "mining"
  | "fishing"
  | "hunting"
  | "crafting"
  | "pottery"
  | "leatherworking"
  | "cooking"
  | "smithing";

export type SkillCategory = "gathering" | "crafting";

export interface ResourceAmount {
  resource: ResourceId;
  amount: number;
}

// An output that only applies once the player's level and/or age reach a threshold
// (e.g. Mining yields Copper Ore only once Bronze Age is reached).
export interface ConditionalOutput extends ResourceAmount {
  levelRequired?: number;
  ageRequired?: AgeId;
}

// A gathering "recipe" has no inputs; a crafting recipe consumes inputs.
export interface Recipe {
  id: string;
  name: string;
  requiredLevel: number;
  inputs: ResourceAmount[];
  outputs: ConditionalOutput[];
}

export interface SkillPrereq {
  skill: SkillId;
  level: number;
}

export interface SkillUpgrade {
  id: string;
  name: string;
  cost: number;
  description: string;
}

export interface SkillDef {
  id: SkillId;
  name: string;
  category: SkillCategory;
  prereqs: SkillPrereq[];
  recipes: Recipe[];
  upgrades: SkillUpgrade[];
}

export const SKILLS: Record<SkillId, SkillDef> = {
  foraging: {
    id: "foraging",
    name: "Foraging",
    category: "gathering",
    prereqs: [],
    recipes: [
      {
        id: "forage",
        name: "Forage",
        requiredLevel: 0,
        inputs: [],
        outputs: [
          { resource: "food", amount: 1 },
          { resource: "plantFibres", amount: 0.5 },
          { resource: "clay", amount: 0.3, levelRequired: 5 },
        ],
      },
    ],
    upgrades: [
      { id: "keenEye", name: "Keen Eye", cost: 5, description: "+1 Food per action" },
      { id: "quickHands", name: "Quick Hands", cost: 10, description: "-0.2s action time" },
      {
        id: "expertForager",
        name: "Expert Forager",
        cost: 20,
        description: "+1 Fibres per action, unlock Clay earlier",
      },
    ],
  },
  woodcutting: {
    id: "woodcutting",
    name: "Woodcutting",
    category: "gathering",
    prereqs: [{ skill: "foraging", level: 10 }],
    recipes: [
      {
        id: "chopWood",
        name: "Chop Wood",
        requiredLevel: 0,
        inputs: [],
        outputs: [
          { resource: "wood", amount: 1 },
          { resource: "logs", amount: 2, levelRequired: 20 },
        ],
      },
    ],
    upgrades: [
      { id: "sharpAxe", name: "Sharp Axe", cost: 5, description: "+1 Wood per action" },
      { id: "efficientLogging", name: "Efficient Logging", cost: 10, description: "-0.2s action time" },
      { id: "timberExpert", name: "Timber Expert", cost: 20, description: "+2 Wood per action" },
    ],
  },
  mining: {
    id: "mining",
    name: "Mining",
    category: "gathering",
    prereqs: [{ skill: "woodcutting", level: 10 }],
    recipes: [
      {
        id: "mineStone",
        name: "Mine Stone",
        requiredLevel: 0,
        inputs: [],
        outputs: [
          { resource: "stone", amount: 1 },
          { resource: "copperOre", amount: 1, ageRequired: "bronzeAge" },
          { resource: "ironOre", amount: 1, ageRequired: "ironAge" },
          { resource: "coal", amount: 1, ageRequired: "medieval" },
        ],
      },
    ],
    upgrades: [
      { id: "betterPick", name: "Better Pick", cost: 5, description: "+1 Stone/Ore per action" },
      { id: "deepMining", name: "Deep Mining", cost: 10, description: "-0.2s action time" },
      { id: "oreSense", name: "Ore Sense", cost: 20, description: "Chance for double ore" },
    ],
  },
  fishing: {
    id: "fishing",
    name: "Fishing",
    category: "gathering",
    prereqs: [{ skill: "foraging", level: 10 }],
    recipes: [
      {
        id: "fish",
        name: "Fish",
        requiredLevel: 0,
        inputs: [],
        outputs: [{ resource: "rawFish", amount: 1 }],
      },
    ],
    upgrades: [
      { id: "betterBait", name: "Better Bait", cost: 5, description: "+1 Fish per action" },
      { id: "netFishing", name: "Net Fishing", cost: 10, description: "-0.2s action time" },
      { id: "masterFisher", name: "Master Fisher", cost: 20, description: "+2 Fish per action" },
    ],
  },
  hunting: {
    id: "hunting",
    name: "Hunting",
    category: "gathering",
    prereqs: [{ skill: "foraging", level: 10 }],
    recipes: [
      {
        id: "hunt",
        name: "Hunt",
        requiredLevel: 0,
        inputs: [],
        outputs: [
          { resource: "rawHides", amount: 1 },
          { resource: "food", amount: 0.5 },
        ],
      },
    ],
    upgrades: [
      { id: "keenHunter", name: "Keen Hunter", cost: 5, description: "+1 Hide per action" },
      { id: "swiftHunt", name: "Swift Hunt", cost: 10, description: "-0.2s action time" },
      { id: "masterHunter", name: "Master Hunter", cost: 20, description: "+1 extra Food per action" },
    ],
  },
  crafting: {
    id: "crafting",
    name: "Crafting",
    category: "crafting",
    prereqs: [
      { skill: "woodcutting", level: 10 },
      { skill: "mining", level: 10 },
    ],
    recipes: [
      {
        id: "tools",
        name: "Tools",
        requiredLevel: 0,
        inputs: [
          { resource: "wood", amount: 1 },
          { resource: "stone", amount: 1 },
        ],
        outputs: [{ resource: "tools", amount: 1 }],
      },
      {
        id: "cordage",
        name: "Cordage",
        requiredLevel: 5,
        inputs: [
          { resource: "plantFibres", amount: 1 },
          { resource: "wood", amount: 1 },
        ],
        outputs: [{ resource: "cordage", amount: 1 }],
      },
      {
        id: "baskets",
        name: "Baskets",
        requiredLevel: 15,
        inputs: [
          { resource: "cordage", amount: 1 },
          { resource: "wood", amount: 1 },
        ],
        outputs: [{ resource: "baskets", amount: 1 }],
      },
    ],
    upgrades: [
      { id: "efficiency", name: "Efficiency", cost: 5, description: "-0.2s action time" },
      { id: "betterRecipes", name: "Better Recipes", cost: 10, description: "+1 extra output per action" },
      { id: "mastery", name: "Mastery", cost: 20, description: "-0.4s action time" },
    ],
  },
  pottery: {
    id: "pottery",
    name: "Pottery",
    category: "crafting",
    prereqs: [{ skill: "foraging", level: 10 }],
    recipes: [
      {
        id: "potteryVessel",
        name: "Pottery Vessel",
        requiredLevel: 0,
        inputs: [{ resource: "clay", amount: 1 }],
        outputs: [{ resource: "potteryVessel", amount: 1 }],
      },
    ],
    upgrades: [
      { id: "efficiency", name: "Efficiency", cost: 5, description: "-0.2s action time" },
      { id: "betterRecipes", name: "Better Recipes", cost: 10, description: "+1 extra output per action" },
      { id: "mastery", name: "Mastery", cost: 20, description: "-0.4s action time" },
    ],
  },
  leatherworking: {
    id: "leatherworking",
    name: "Leatherworking",
    category: "crafting",
    prereqs: [{ skill: "hunting", level: 10 }],
    recipes: [
      {
        id: "preparedHides",
        name: "Prepared Hides",
        requiredLevel: 0,
        inputs: [{ resource: "rawHides", amount: 1 }],
        outputs: [{ resource: "preparedHides", amount: 1 }],
      },
      {
        id: "clothing",
        name: "Clothing",
        requiredLevel: 10,
        inputs: [{ resource: "preparedHides", amount: 1 }],
        outputs: [{ resource: "clothing", amount: 1 }],
      },
    ],
    upgrades: [
      { id: "efficiency", name: "Efficiency", cost: 5, description: "-0.2s action time" },
      { id: "betterRecipes", name: "Better Recipes", cost: 10, description: "+1 extra output per action" },
      { id: "mastery", name: "Mastery", cost: 20, description: "-0.4s action time" },
    ],
  },
  cooking: {
    id: "cooking",
    name: "Cooking",
    category: "crafting",
    prereqs: [{ skill: "fishing", level: 10 }],
    recipes: [
      {
        id: "cookedFish",
        name: "Cooked Fish",
        requiredLevel: 0,
        inputs: [{ resource: "rawFish", amount: 1 }],
        outputs: [{ resource: "cookedFish", amount: 1 }],
      },
      {
        id: "preparedMeal",
        name: "Prepared Meal",
        requiredLevel: 5,
        inputs: [{ resource: "food", amount: 1 }],
        outputs: [{ resource: "preparedMeal", amount: 1 }],
      },
    ],
    upgrades: [
      { id: "efficiency", name: "Efficiency", cost: 5, description: "-0.2s action time" },
      { id: "betterRecipes", name: "Better Recipes", cost: 10, description: "+1 extra output per action" },
      { id: "mastery", name: "Mastery", cost: 20, description: "-0.4s action time" },
    ],
  },
  smithing: {
    id: "smithing",
    name: "Smithing",
    category: "crafting",
    prereqs: [
      { skill: "mining", level: 10 },
      { skill: "crafting", level: 10 },
    ],
    recipes: [
      {
        id: "copperBar",
        name: "Copper Bar",
        requiredLevel: 0,
        inputs: [{ resource: "copperOre", amount: 2 }],
        outputs: [{ resource: "copperBar", amount: 1 }],
      },
      {
        id: "ironBar",
        name: "Iron Bar",
        requiredLevel: 20,
        inputs: [
          { resource: "ironOre", amount: 2 },
          { resource: "coal", amount: 1 },
        ],
        outputs: [{ resource: "ironBar", amount: 1 }],
      },
      {
        id: "steelBar",
        name: "Steel Bar",
        requiredLevel: 40,
        inputs: [
          { resource: "ironBar", amount: 1 },
          { resource: "coal", amount: 2 },
        ],
        outputs: [{ resource: "steelBar", amount: 1 }],
      },
    ],
    upgrades: [
      { id: "efficiency", name: "Efficiency", cost: 5, description: "-0.2s action time" },
      { id: "betterRecipes", name: "Better Recipes", cost: 10, description: "+1 extra output per action" },
      { id: "mastery", name: "Mastery", cost: 20, description: "-0.4s action time" },
    ],
  },
};

export const SKILL_ORDER: SkillId[] = [
  "foraging",
  "woodcutting",
  "mining",
  "fishing",
  "hunting",
  "crafting",
  "pottery",
  "leatherworking",
  "cooking",
  "smithing",
];

export type AgeId = "stoneAge" | "bronzeAge" | "ironAge" | "medieval" | "renaissance";

export interface AgeDef {
  id: AgeId;
  name: string;
  // A condition is a set of skill-level requirements; all must be met.
  condition: SkillPrereq[];
  bonus: { timeMult: number; outputMult: number };
}

// Ages are checked in order; an age is active once its own condition, and every
// prior age's condition, is met (bonuses are cumulative by construction below).
export const AGES: AgeDef[] = [
  {
    id: "stoneAge",
    name: "Stone Age",
    condition: [],
    bonus: { timeMult: 1, outputMult: 1 },
  },
  {
    id: "bronzeAge",
    name: "Bronze Age",
    condition: [{ skill: "mining", level: 10 }],
    bonus: { timeMult: 0.9, outputMult: 1.1 },
  },
  {
    id: "ironAge",
    name: "Iron Age",
    condition: [{ skill: "smithing", level: 20 }],
    bonus: { timeMult: 0.9, outputMult: 1.1 },
  },
  {
    id: "medieval",
    name: "Medieval",
    condition: [{ skill: "smithing", level: 40 }],
    bonus: { timeMult: 0.9, outputMult: 1.1 },
  },
  {
    id: "renaissance",
    name: "Renaissance",
    condition: [
      { skill: "mining", level: 60 },
      { skill: "smithing", level: 60 },
    ],
    bonus: { timeMult: 0.85, outputMult: 1.15 },
  },
];

export const BASE_ACTION_TIME = 2; // seconds
export const XP_PER_ACTION = 5;
export const MAX_LEVEL = 99;
