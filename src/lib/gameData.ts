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
  | "enchantedGear"
  | "starstone"
  | "glory";

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
  enchantedGear: { name: "Enchanted Gear" },
  starstone: { name: "Starstone" },
  glory: { name: "Glory" },
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
  | "construction"
  | "conquest";

export type SkillCategory = "gathering" | "crafting" | "combat";

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

// One mechanical consequence of owning an upgrade. Upgrades list any number of
// these; the engine folds every owned upgrade's effects together per action.
export type UpgradeEffect =
  | { type: "flatTime"; seconds: number }
  | { type: "timeMult"; mult: number }
  | { type: "flatOutput"; resource: ResourceId; amount: number }
  | { type: "flatPrimaryOutput"; amount: number }
  | { type: "outputMult"; mult: number }
  | { type: "doubleChance"; chance: number; resources?: ResourceId[] }
  | { type: "refundChance"; chance: number }
  | { type: "xpMult"; mult: number }
  | { type: "byproduct"; resource: ResourceId; amount: number; chance?: number }
  | { type: "outputLevel"; resource: ResourceId; level: number };

export interface SkillUpgrade {
  id: string;
  name: string;
  cost: number;
  description: string;
  effects: UpgradeEffect[];
}

export interface SkillDef {
  id: SkillId;
  name: string;
  description: string;
  category: SkillCategory;
  prereqs: SkillPrereq[];
  // Stays locked until this age is reached, regardless of prereqs.
  ageRequired?: AgeId;
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
      { id: "keenEye", name: "Keen Eye", cost: 5, description: "+1 Food per action", effects: [{ type: "flatOutput", resource: "food", amount: 1 }] },
      { id: "quickHands", name: "Quick Hands", cost: 10, description: "-0.2s action time", effects: [{ type: "flatTime", seconds: 0.2 }] },
      {
        id: "bountifulHarvest",
        name: "Bountiful Harvest",
        cost: 20,
        description: "25% chance to double everything foraged; Clay found from level 1",
        effects: [
          { type: "doubleChance", chance: 0.25 },
          { type: "outputLevel", resource: "clay", level: 1 },
        ],
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
      { id: "sharpAxe", name: "Sharp Axe", cost: 5, description: "+1 Wood per action", effects: [{ type: "flatOutput", resource: "wood", amount: 1 }] },
      { id: "efficientLogging", name: "Felling Technique", cost: 10, description: "-0.2s action time", effects: [{ type: "flatTime", seconds: 0.2 }] },
      {
        id: "timberExpert",
        name: "Timber Expert",
        cost: 20,
        description: "Logs from level 5 instead of 20, and +1 Log per action",
        effects: [
          { type: "outputLevel", resource: "logs", level: 5 },
          { type: "flatOutput", resource: "logs", amount: 1 },
        ],
      },
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
      {
        id: "betterPick",
        name: "Better Pick",
        cost: 5,
        description: "+1 Stone, Ore and Coal per action",
        effects: [
          { type: "flatOutput", resource: "stone", amount: 1 },
          { type: "flatOutput", resource: "copperOre", amount: 1 },
          { type: "flatOutput", resource: "ironOre", amount: 1 },
          { type: "flatOutput", resource: "coal", amount: 1 },
        ],
      },
      { id: "deepMining", name: "Deep Shafts", cost: 10, description: "-0.2s action time", effects: [{ type: "flatTime", seconds: 0.2 }] },
      {
        id: "oreSense",
        name: "Ore Sense",
        cost: 20,
        description: "30% chance to double all mining output",
        effects: [{ type: "doubleChance", chance: 0.3 }],
      },
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
      { id: "betterBait", name: "Better Bait", cost: 5, description: "+1 Fish per action", effects: [{ type: "flatOutput", resource: "rawFish", amount: 1 }] },
      { id: "netFishing", name: "Cast Nets", cost: 10, description: "-0.2s action time", effects: [{ type: "flatTime", seconds: 0.2 }] },
      {
        id: "masterFisher",
        name: "Gutting Knife",
        cost: 20,
        description: "+1 Fish, and every catch also yields 1 Food",
        effects: [
          { type: "flatOutput", resource: "rawFish", amount: 1 },
          { type: "byproduct", resource: "food", amount: 1 },
        ],
      },
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
      { id: "keenHunter", name: "Keen Hunter", cost: 5, description: "+1 Hide per action", effects: [{ type: "flatOutput", resource: "rawHides", amount: 1 }] },
      { id: "swiftHunt", name: "Swift Stalker", cost: 10, description: "-0.2s action time", effects: [{ type: "flatTime", seconds: 0.2 }] },
      {
        id: "sinewCordage",
        name: "Sinew Cordage",
        cost: 20,
        description: "50% chance each hunt also yields 1 Cordage",
        effects: [{ type: "byproduct", resource: "cordage", amount: 1, chance: 0.5 }],
      },
    ],
  },
  crafting: {
    id: "crafting",
    name: "Crafting",
    description: "Shape stone and fit wooden handles to make useful items. Tools, cordage, and baskets transform how your people work and live.",
    category: "crafting",
    prereqs: [{ skill: "woodcutting", level: 10 }],
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
      { id: "steadyHands", name: "Steady Hands", cost: 5, description: "-0.2s action time", effects: [{ type: "flatTime", seconds: 0.2 }] },
      {
        id: "scrapSalvage",
        name: "Scrap Salvage",
        cost: 10,
        description: "25% chance materials aren't consumed",
        effects: [{ type: "refundChance", chance: 0.25 }],
      },
      {
        id: "assemblyLine",
        name: "Assembly Line",
        cost: 20,
        description: "+1 output and -0.2s action time",
        effects: [
          { type: "flatPrimaryOutput", amount: 1 },
          { type: "flatTime", seconds: 0.2 },
        ],
      },
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
      { id: "fastKiln", name: "Fast Kiln", cost: 5, description: "-0.2s action time", effects: [{ type: "flatTime", seconds: 0.2 }] },
      {
        id: "clayReclaim",
        name: "Clay Reclaim",
        cost: 10,
        description: "30% chance clay isn't consumed",
        effects: [{ type: "refundChance", chance: 0.3 }],
      },
      {
        id: "kilnMastery",
        name: "Kiln Mastery",
        cost: 20,
        description: "+1 Vessel per action and +25% XP",
        effects: [
          { type: "flatPrimaryOutput", amount: 1 },
          { type: "xpMult", mult: 1.25 },
        ],
      },
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
      { id: "sharpBlade", name: "Sharp Blade", cost: 5, description: "-0.2s action time", effects: [{ type: "flatTime", seconds: 0.2 }] },
      { id: "tanningVats", name: "Tanning Vats", cost: 10, description: "+1 output per action", effects: [{ type: "flatPrimaryOutput", amount: 1 }] },
      {
        id: "fullHideUse",
        name: "Full Hide Use",
        cost: 20,
        description: "30% chance hides aren't consumed",
        effects: [{ type: "refundChance", chance: 0.3 }],
      },
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
      { id: "hotCoals", name: "Hot Coals", cost: 5, description: "-0.2s action time", effects: [{ type: "flatTime", seconds: 0.2 }] },
      { id: "bigPot", name: "Big Pot", cost: 10, description: "+1 output per action", effects: [{ type: "flatPrimaryOutput", amount: 1 }] },
      { id: "seasoning", name: "Seasoning", cost: 20, description: "+50% XP", effects: [{ type: "xpMult", mult: 1.5 }] },
    ],
  },
  smithing: {
    id: "smithing",
    name: "Smithing",
    description: "The secrets of the forge are revealed. Smelting ore into metal bars unlocks the march toward a new age of civilization.",
    category: "crafting",
    prereqs: [{ skill: "mining", level: 10 }],
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
      {
        id: "enchantedGear",
        name: "Enchanted Gear",
        requiredLevel: 60,
        inputs: [
          { resource: "steelBar", amount: 2 },
          { resource: "cloth", amount: 2 },
          { resource: "ale", amount: 1 },
        ],
        outputs: [{ resource: "enchantedGear", amount: 1 }],
      },
      {
        id: "starstone",
        name: "Starstone",
        requiredLevel: 80,
        inputs: [
          { resource: "steelBar", amount: 5 },
          { resource: "enchantedGear", amount: 2 },
          { resource: "mead", amount: 3 },
        ],
        outputs: [{ resource: "starstone", amount: 1 }],
      },
    ],
    upgrades: [
      { id: "bellows", name: "Bellows", cost: 5, description: "-0.2s action time", effects: [{ type: "flatTime", seconds: 0.2 }] },
      {
        id: "flux",
        name: "Flux",
        cost: 10,
        description: "25% chance ore and coal aren't consumed",
        effects: [{ type: "refundChance", chance: 0.25 }],
      },
      {
        id: "masterSmith",
        name: "Master Smith",
        cost: 20,
        description: "+1 output and -0.3s action time",
        effects: [
          { type: "flatPrimaryOutput", amount: 1 },
          { type: "flatTime", seconds: 0.3 },
        ],
      },
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
      { id: "greenThumb", name: "Green Thumb", cost: 5, description: "+1 Grain per action", effects: [{ type: "flatOutput", resource: "grain", amount: 1 }] },
      { id: "irrigation", name: "Irrigation", cost: 10, description: "-0.2s action time", effects: [{ type: "flatTime", seconds: 0.2 }] },
      {
        id: "masterFarmer",
        name: "Rich Soil",
        cost: 20,
        description: "+25% to all farm yields",
        effects: [{ type: "outputMult", mult: 1.25 }],
      },
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
      { id: "gentleHand", name: "Gentle Hand", cost: 5, description: "+1 Wool per action", effects: [{ type: "flatOutput", resource: "wool", amount: 1 }] },
      { id: "swiftShepherd", name: "Swift Shepherd", cost: 10, description: "-0.2s action time", effects: [{ type: "flatTime", seconds: 0.2 }] },
      {
        id: "masterHerder",
        name: "Breeding Stock",
        cost: 20,
        description: "+1 Milk and +1 Raw Hide per action",
        effects: [
          { type: "flatOutput", resource: "milk", amount: 1 },
          { type: "flatOutput", resource: "rawHides", amount: 1 },
        ],
      },
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
      { id: "spindle", name: "Spindle", cost: 5, description: "-0.2s action time", effects: [{ type: "flatTime", seconds: 0.2 }] },
      { id: "tightWeave", name: "Tight Weave", cost: 10, description: "+1 output per action", effects: [{ type: "flatPrimaryOutput", amount: 1 }] },
      {
        id: "greatLoom",
        name: "Great Loom",
        cost: 20,
        description: "-0.4s action time",
        effects: [{ type: "flatTime", seconds: 0.4 }],
      },
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
      { id: "sawhorse", name: "Sawhorse", cost: 5, description: "-0.2s action time", effects: [{ type: "flatTime", seconds: 0.2 }] },
      {
        id: "woodGlue",
        name: "Wood Glue",
        cost: 10,
        description: "25% chance materials aren't consumed",
        effects: [{ type: "refundChance", chance: 0.25 }],
      },
      {
        id: "offcuts",
        name: "Offcuts",
        cost: 20,
        description: "Every action also yields 1 Wood",
        effects: [{ type: "byproduct", resource: "wood", amount: 1 }],
      },
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
      { id: "yeastCulture", name: "Yeast Culture", cost: 5, description: "+1 output per action", effects: [{ type: "flatPrimaryOutput", amount: 1 }] },
      {
        id: "bigBarrels",
        name: "Big Barrels",
        cost: 10,
        description: "25% chance to double the batch",
        effects: [{ type: "doubleChance", chance: 0.25 }],
      },
      {
        id: "masterBrewer",
        name: "Master Brewer",
        cost: 20,
        description: "-0.4s action time and +25% XP",
        effects: [
          { type: "flatTime", seconds: 0.4 },
          { type: "xpMult", mult: 1.25 },
        ],
      },
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
      { id: "scaffolding", name: "Scaffolding", cost: 5, description: "-0.2s action time", effects: [{ type: "flatTime", seconds: 0.2 }] },
      { id: "mortarMix", name: "Mortar Mix", cost: 10, description: "+1 output per action", effects: [{ type: "flatPrimaryOutput", amount: 1 }] },
      {
        id: "foreman",
        name: "Foreman",
        cost: 20,
        description: "+50% XP and 25% chance materials aren't consumed",
        effects: [
          { type: "xpMult", mult: 1.5 },
          { type: "refundChance", chance: 0.25 },
        ],
      },
    ],
  },
  conquest: {
    id: "conquest",
    name: "Conquest",
    description: "March your banners across the known world. Every victory earns Glory, the only offering the legends will answer.",
    category: "combat",
    prereqs: [],
    ageRequired: "renaissance",
    recipes: [
      { id: "raid", name: "Raid", requiredLevel: 0, inputs: [], outputs: [{ resource: "glory", amount: 1 }] },
      { id: "campaign", name: "Campaign", requiredLevel: 30, inputs: [], outputs: [{ resource: "glory", amount: 2 }] },
      { id: "conquer", name: "Conquer", requiredLevel: 60, inputs: [], outputs: [{ resource: "glory", amount: 3 }] },
    ],
    upgrades: [],
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
  "conquest",
];

export type AgeId = "stoneAge" | "bronzeAge" | "ironAge" | "medieval" | "renaissance";

export interface AgeReward {
  // Copies of AGE_REWARD_UNIT granted on reaching this age.
  heroCopies: number;
  // Raises the highest star rarity regular summons can roll.
  maxSummonStars?: number;
  // Opens the Campaign and The Abyss.
  unlocksCombat?: boolean;
  unlocksSkill?: SkillId;
}

export interface AgeDef {
  id: AgeId;
  name: string;
  // A condition is a set of skill-level requirements; all must be met.
  condition: SkillPrereq[];
  // This age's own contribution; getAgeBonus sums every age reached.
  bonus: { flatTime: number; outputMult: number };
  reward: AgeReward;
}

// Every age-up grants copies of this 4★ Necromancer (1+2+3+4 = 10, enough to
// promote one to 8★). Players see it as a "4★ hero" until it arrives.
export const AGE_REWARD_UNIT = "vampire";

// Ages are advanced one at a time by meeting the next age's skill condition
// and paying its AGE_ADVANCE_COSTS.
export const AGES: AgeDef[] = [
  {
    id: "stoneAge",
    name: "Stone Age",
    condition: [],
    bonus: { flatTime: 0, outputMult: 1 },
    reward: { heroCopies: 0 },
  },
  {
    id: "bronzeAge",
    name: "Bronze Age",
    condition: [{ skill: "mining", level: 10 }],
    bonus: { flatTime: 0.2, outputMult: 1 },
    reward: { heroCopies: 1, unlocksCombat: true },
  },
  {
    id: "ironAge",
    name: "Iron Age",
    condition: [{ skill: "smithing", level: 20 }],
    bonus: { flatTime: 0.2, outputMult: 1 },
    reward: { heroCopies: 2, maxSummonStars: 4 },
  },
  {
    id: "medieval",
    name: "Medieval",
    condition: [{ skill: "smithing", level: 40 }],
    bonus: { flatTime: 0.2, outputMult: 1 },
    reward: { heroCopies: 3, maxSummonStars: 5 },
  },
  {
    id: "renaissance",
    name: "Renaissance",
    condition: [
      { skill: "mining", level: 60 },
      { skill: "smithing", level: 60 },
    ],
    bonus: { flatTime: 0, outputMult: 2 },
    reward: { heroCopies: 4, unlocksSkill: "conquest" },
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
export const XP_PER_ACTION = 10;
export const XP_SCALING_RATE = 1.1;
export const MAX_LEVEL = 99;

// Civilization-wide "mastery" upgrades. They apply to every skill and only go on
// sale once any single skill reaches MAX_LEVEL.
export const GLOBAL_UPGRADES: SkillUpgrade[] = [
  {
    id: "haste",
    name: "Haste",
    cost: 50,
    description: "Every action takes half as long",
    effects: [{ type: "timeMult", mult: 0.5 }],
  },
  {
    id: "bounty",
    name: "Bounty",
    cost: 50,
    description: "Double all resources gained",
    effects: [{ type: "outputMult", mult: 2 }],
  },
  {
    id: "wisdom",
    name: "Wisdom",
    cost: 50,
    description: "Double all XP gained",
    effects: [{ type: "xpMult", mult: 2 }],
  },
];

// Free, always-available cheats surfaced in the shop's debug section.
// Debug-only global upgrades, toggled from the debug panel (never sold).
export const DEBUG_GLOBAL_UPGRADES: SkillUpgrade[] = [
  {
    id: "debugSpeed",
    name: "Hyperdrive",
    cost: 0,
    description: "Actions are 100x faster (debug)",
    effects: [{ type: "timeMult", mult: 0.01 }],
  },
];

// Legacy crafting saves used one shared id per slot across every crafting skill.
export const LEGACY_UPGRADE_SLOTS: Record<string, number> = {
  efficiency: 0,
  betterRecipes: 1,
  mastery: 2,
  expertForager: 2,
  masterHunter: 2,
};

