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
  | "steelBar"
  | "copperTools"
  | "ironTools"
  | "steelTools"
  | "grain"
  | "vegetables"
  | "wool"
  | "milk"
  | "thread"
  | "cloth"
  | "fineClothing"
  | "planks"
  | "furniture"
  | "bow"
  | "ale"
  | "mead"
  | "bricks"
  | "shelter"
  | "unitSwordsman"
  | "unitSpearman"
  | "unitArcher";

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
  copperTools: { name: "Copper Tools" },
  ironTools: { name: "Iron Tools" },
  steelTools: { name: "Steel Tools" },
  grain: { name: "Grain" },
  vegetables: { name: "Vegetables" },
  wool: { name: "Wool" },
  milk: { name: "Milk" },
  thread: { name: "Thread" },
  cloth: { name: "Cloth" },
  fineClothing: { name: "Fine Clothing" },
  planks: { name: "Planks" },
  furniture: { name: "Furniture" },
  bow: { name: "Bow" },
  ale: { name: "Ale" },
  mead: { name: "Mead" },
  bricks: { name: "Bricks" },
  shelter: { name: "Shelter" },
  unitSwordsman: { name: "Swordsman" },
  unitSpearman: { name: "Spearman" },
  unitArcher: { name: "Archer" },
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
  | "smithing"
  | "farming"
  | "herding"
  | "weaving"
  | "carpentry"
  | "brewing"
  | "construction";

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
  description: string;
  category: SkillCategory;
  prereqs: SkillPrereq[];
  recipes: Recipe[];
  upgrades: SkillUpgrade[];
}

export const SKILLS: Record<SkillId, SkillDef> = {
  foraging: {
    id: "foraging",
    name: "Foraging",
    description: "Forage for berries, roots and useful fibres. Repeated gathering reveals new materials hidden in the undergrowth.",
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
    description: "Experience gathering wood reveals how to fell whole trees. Timber becomes the backbone of construction, tools, and fuel.",
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
    description: "Gather loose stones from outcrops and riverbeds. Deeper excavation reveals ores that will shape the ages to come.",
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
          // Coal unlocks alongside Iron Age (not Medieval) so Iron Bar/Tools
          // (which consume coal, requiredLevel 20/25) are actually craftable
          // during Iron Age — needed to earn the resources that pay for the
          // Iron Age -> Medieval advance below.
          { resource: "coal", amount: 1, ageRequired: "ironAge" },
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
    description: "A water source offers another food supply. Assign fishers to catch food continuously; later discoveries improve catches.",
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
    description: "Track wild game beyond the camp. The hunt provides raw hides and meat to sustain and equip your growing people.",
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
    description: "Shape stone and fit wooden handles to make useful items. Tools, cordage, and baskets transform how your people work and live.",
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
    description: "Clay and controlled fire reveal pottery. Shape and fire clay into vessels for storage that will anchor a settled life.",
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
    description: "Practice preparing hides reveals how to make durable coverings. Warm clothing improves life and opens new possibilities.",
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
    description: "Controlled fire and fresh catches reveal the art of cooking. Prepared meals nourish your people and fuel greater ambitions.",
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
    description: "The secrets of the forge are revealed. Smelting ore into metal bars unlocks the march toward a new age of civilization.",
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
      {
        id: "copperTools",
        name: "Copper Tools",
        requiredLevel: 5,
        inputs: [
          { resource: "copperBar", amount: 2 },
          { resource: "logs", amount: 1 },
        ],
        outputs: [{ resource: "copperTools", amount: 1 }],
      },
      {
        id: "ironTools",
        name: "Iron Tools",
        requiredLevel: 25,
        inputs: [
          { resource: "ironBar", amount: 2 },
          { resource: "logs", amount: 1 },
        ],
        outputs: [{ resource: "ironTools", amount: 1 }],
      },
      {
        id: "steelTools",
        name: "Steel Tools",
        requiredLevel: 45,
        inputs: [
          { resource: "steelBar", amount: 2 },
          { resource: "logs", amount: 1 },
        ],
        outputs: [{ resource: "steelTools", amount: 1 }],
      },
    ],
    upgrades: [
      { id: "efficiency", name: "Efficiency", cost: 5, description: "-0.2s action time" },
      { id: "betterRecipes", name: "Better Recipes", cost: 10, description: "+1 extra output per action" },
      { id: "mastery", name: "Mastery", cost: 20, description: "-0.4s action time" },
    ],
  },
  farming: {
    id: "farming",
    name: "Farming",
    description: "Seeds scattered in fertile soil reveal a truth: food need not be found — it can be grown. Agriculture transforms wanderers into settlers.",
    category: "gathering",
    prereqs: [
      { skill: "foraging", level: 15 },
      { skill: "cooking", level: 5 },
    ],
    recipes: [
      {
        id: "harvestGrain",
        name: "Harvest Grain",
        requiredLevel: 0,
        inputs: [],
        outputs: [
          { resource: "grain", amount: 2 },
          { resource: "food", amount: 0.5 },
        ],
      },
      {
        id: "harvestVegetables",
        name: "Harvest Vegetables",
        requiredLevel: 15,
        inputs: [],
        outputs: [
          { resource: "vegetables", amount: 1 },
          { resource: "food", amount: 1 },
        ],
      },
    ],
    upgrades: [
      { id: "greenThumb", name: "Green Thumb", cost: 5, description: "+1 Grain per action" },
      { id: "irrigation", name: "Irrigation", cost: 10, description: "-0.2s action time" },
      { id: "masterFarmer", name: "Master Farmer", cost: 20, description: "+1 Vegetables per action" },
    ],
  },
  herding: {
    id: "herding",
    name: "Herding",
    description: "A captured beast need not be slain at once. Patient tending reveals the wealth of wool, milk, and a bond between keeper and herd.",
    category: "gathering",
    prereqs: [{ skill: "hunting", level: 15 }],
    recipes: [
      {
        id: "tendHerd",
        name: "Tend Herd",
        requiredLevel: 0,
        inputs: [],
        outputs: [
          { resource: "wool", amount: 1 },
          { resource: "milk", amount: 1 },
        ],
      },
      {
        id: "butcher",
        name: "Butcher",
        requiredLevel: 10,
        inputs: [],
        outputs: [
          { resource: "food", amount: 2 },
          { resource: "rawHides", amount: 1 },
        ],
      },
    ],
    upgrades: [
      { id: "gentleHand", name: "Gentle Hand", cost: 5, description: "+1 Wool per action" },
      { id: "swiftShepherd", name: "Swift Shepherd", cost: 10, description: "-0.2s action time" },
      { id: "masterHerder", name: "Master Herder", cost: 20, description: "+1 Milk per action" },
    ],
  },
  weaving: {
    id: "weaving",
    name: "Weaving",
    description: "Twisted fibres become thread; thread becomes cloth. The loom transforms raw material into fabric that shields against cold and marks identity.",
    category: "crafting",
    prereqs: [
      { skill: "crafting", level: 10 },
      { skill: "herding", level: 5 },
    ],
    recipes: [
      {
        id: "thread",
        name: "Thread",
        requiredLevel: 0,
        inputs: [{ resource: "plantFibres", amount: 2 }],
        outputs: [{ resource: "thread", amount: 1 }],
      },
      {
        id: "cloth",
        name: "Cloth",
        requiredLevel: 10,
        inputs: [
          { resource: "thread", amount: 1 },
          { resource: "wool", amount: 1 },
        ],
        outputs: [{ resource: "cloth", amount: 1 }],
      },
      {
        id: "fineClothing",
        name: "Fine Clothing",
        requiredLevel: 25,
        inputs: [
          { resource: "cloth", amount: 2 },
          { resource: "preparedHides", amount: 1 },
        ],
        outputs: [{ resource: "fineClothing", amount: 1 }],
      },
    ],
    upgrades: [
      { id: "efficiency", name: "Efficiency", cost: 5, description: "-0.2s action time" },
      { id: "betterRecipes", name: "Better Recipes", cost: 10, description: "+1 extra output per action" },
      { id: "mastery", name: "Mastery", cost: 20, description: "-0.4s action time" },
    ],
  },
  carpentry: {
    id: "carpentry",
    name: "Carpentry",
    description: "Beyond rough-hewn timber lies the craft of precise joinery. Shaped planks and fitted beams raise structures that shelter and define a people.",
    category: "crafting",
    prereqs: [
      { skill: "woodcutting", level: 20 },
      { skill: "crafting", level: 10 },
    ],
    recipes: [
      {
        id: "planks",
        name: "Planks",
        requiredLevel: 0,
        inputs: [{ resource: "logs", amount: 2 }],
        outputs: [{ resource: "planks", amount: 3 }],
      },
      {
        id: "bow",
        name: "Bow",
        requiredLevel: 10,
        inputs: [
          { resource: "planks", amount: 1 },
          { resource: "cordage", amount: 1 },
        ],
        outputs: [{ resource: "bow", amount: 1 }],
      },
      {
        id: "furniture",
        name: "Furniture",
        requiredLevel: 20,
        inputs: [
          { resource: "planks", amount: 3 },
          { resource: "tools", amount: 1 },
        ],
        outputs: [{ resource: "furniture", amount: 1 }],
      },
    ],
    upgrades: [
      { id: "efficiency", name: "Efficiency", cost: 5, description: "-0.2s action time" },
      { id: "betterRecipes", name: "Better Recipes", cost: 10, description: "+1 extra output per action" },
      { id: "mastery", name: "Mastery", cost: 20, description: "-0.4s action time" },
    ],
  },
  brewing: {
    id: "brewing",
    name: "Brewing",
    description: "Grain left to ferment reveals an ancient secret. Brewed drink warms the body, strengthens spirits, and brings cheer to gathering halls.",
    category: "crafting",
    prereqs: [
      { skill: "cooking", level: 15 },
      { skill: "farming", level: 10 },
    ],
    recipes: [
      {
        id: "ale",
        name: "Ale",
        requiredLevel: 0,
        inputs: [
          { resource: "grain", amount: 3 },
          { resource: "potteryVessel", amount: 1 },
        ],
        outputs: [{ resource: "ale", amount: 2 }],
      },
      {
        id: "mead",
        name: "Mead",
        requiredLevel: 15,
        inputs: [
          { resource: "food", amount: 2 },
          { resource: "potteryVessel", amount: 1 },
        ],
        outputs: [{ resource: "mead", amount: 1 }],
      },
    ],
    upgrades: [
      { id: "efficiency", name: "Efficiency", cost: 5, description: "-0.2s action time" },
      { id: "betterRecipes", name: "Better Recipes", cost: 10, description: "+1 extra output per action" },
      { id: "mastery", name: "Mastery", cost: 20, description: "-0.4s action time" },
    ],
  },
  construction: {
    id: "construction",
    name: "Construction",
    description: "Stone and timber together become walls; walls become shelter. The art of building transforms a camp into a settlement that endures.",
    category: "crafting",
    prereqs: [
      { skill: "carpentry", level: 15 },
      { skill: "mining", level: 15 },
    ],
    recipes: [
      {
        id: "bricks",
        name: "Bricks",
        requiredLevel: 0,
        inputs: [
          { resource: "clay", amount: 3 },
          { resource: "coal", amount: 1 },
        ],
        outputs: [{ resource: "bricks", amount: 2 }],
      },
      {
        id: "shelter",
        name: "Shelter",
        requiredLevel: 15,
        inputs: [
          { resource: "planks", amount: 3 },
          { resource: "bricks", amount: 2 },
          { resource: "stone", amount: 2 },
        ],
        outputs: [{ resource: "shelter", amount: 1 }],
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
  "farming",
  "herding",
  "weaving",
  "carpentry",
  "brewing",
  "construction",
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

// Resources consumed to advance INTO the given age (stoneAge has none — it's
// the starting age). Costs use materials actually obtainable in the age being
// left (e.g. Iron Ore/Coal aren't mineable until Iron Age itself, so the Iron
// Age -> Medieval cost uses Iron Bar instead of raw Iron Ore); "Bronze Bar"
// and "Gold Ore" don't exist as distinct resources, so Copper Bar and Fine
// Clothing stand in as the equivalent tier-appropriate materials.
export const AGE_ADVANCE_COSTS: Partial<Record<AgeId, ResourceAmount[]>> = {
  bronzeAge: [
    { resource: "stone", amount: 150 },
    { resource: "wood", amount: 100 },
  ],
  ironAge: [
    { resource: "copperOre", amount: 150 },
    { resource: "copperBar", amount: 75 },
  ],
  medieval: [
    { resource: "ironBar", amount: 200 },
    { resource: "coal", amount: 100 },
  ],
  renaissance: [
    { resource: "steelBar", amount: 300 },
    { resource: "fineClothing", amount: 150 },
  ],
};

export const BASE_ACTION_TIME = 2; // seconds
export const XP_PER_ACTION = 5;
export const MAX_LEVEL = 99;

// ---------- Consumables ----------

export type ConsumableGroup = "tool" | "food" | "clothing" | "container" | "vessel" | "drink" | "shelter";

export interface ConsumableDef {
  resource: ResourceId;
  group: ConsumableGroup;
  consumeChance: number;
  effects: {
    timeReduction?: number;
    xpBonus?: number;
    xpMultiplier?: number;
    outputMultiplier?: number;
  };
  appliesTo?: SkillCategory;
  description: string;
}

export const CONSUMABLES: ConsumableDef[] = [
  { resource: "tools", group: "tool", consumeChance: 0.2, effects: { timeReduction: 0.3 }, appliesTo: "gathering", description: "-0.3s gathering (20%/action)" },
  { resource: "copperTools", group: "tool", consumeChance: 0.15, effects: { timeReduction: 0.5 }, appliesTo: "gathering", description: "-0.5s gathering (15%/action)" },
  { resource: "ironTools", group: "tool", consumeChance: 0.1, effects: { timeReduction: 0.7 }, appliesTo: "gathering", description: "-0.7s gathering (10%/action)" },
  { resource: "steelTools", group: "tool", consumeChance: 0.05, effects: { timeReduction: 1.0 }, appliesTo: "gathering", description: "-1.0s gathering (5%/action)" },
  { resource: "cookedFish", group: "food", consumeChance: 0.5, effects: { xpBonus: 3 }, description: "+3 XP (50%/action)" },
  { resource: "preparedMeal", group: "food", consumeChance: 0.2, effects: { xpBonus: 5 }, description: "+5 XP (20%/action)" },
  { resource: "clothing", group: "clothing", consumeChance: 0.05, effects: { xpMultiplier: 1.1 }, description: "+10% XP (5%/action)" },
  { resource: "baskets", group: "container", consumeChance: 0.05, effects: { outputMultiplier: 1.2 }, appliesTo: "gathering", description: "+20% gathering output (5%/action)" },
  { resource: "potteryVessel", group: "vessel", consumeChance: 0.05, effects: { outputMultiplier: 1.2 }, appliesTo: "crafting", description: "+20% crafting output (5%/action)" },
  { resource: "bow", group: "tool", consumeChance: 0.1, effects: { timeReduction: 0.4 }, appliesTo: "gathering", description: "-0.4s gathering (10%/action)" },
  { resource: "fineClothing", group: "clothing", consumeChance: 0.03, effects: { xpMultiplier: 1.15 }, description: "+15% XP (3%/action)" },
  { resource: "ale", group: "drink", consumeChance: 0.3, effects: { xpBonus: 4 }, description: "+4 XP (30%/action)" },
  { resource: "mead", group: "drink", consumeChance: 0.1, effects: { xpBonus: 7 }, description: "+7 XP (10%/action)" },
  { resource: "furniture", group: "shelter", consumeChance: 0.02, effects: { outputMultiplier: 1.1 }, appliesTo: "crafting", description: "+10% crafting output (2%/action)" },
  { resource: "shelter", group: "shelter", consumeChance: 0.01, effects: { xpMultiplier: 1.2, outputMultiplier: 1.1 }, description: "+20% XP, +10% output (1%/action)" },
];
