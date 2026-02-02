// ==================== CONSTANTS ====================
const CHUNK_SIZE = 16;
const WORLD_HEIGHT = 128;
const GRAVITY = 28;
const JUMP_FORCE = 9;
const PLAYER_HEIGHT = 1.62;
const PLAYER_WIDTH = 0.6;
const WALK_SPEED = 4.3;
const SPRINT_SPEED = 5.6;
const FLY_SPEED = 10;
const WATER_LEVEL = 0;
const PLACE_COOLDOWN = 0.3;
const MAX_HEALTH = 20;
const MAX_STACK_SIZE = 64;
const SAVE_VERSION = 1;
const MAX_SAVE_SLOTS = 3;
const AUTOSAVE_INTERVAL = 30000;

// Block types
const BLOCK = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4, LEAVES: 5,
  SAND: 6, /*WATER: 7,*/ COBBLE: 8, PLANKS: 9, BEDROCK: 10,
  GRAVEL: 11, COAL_ORE: 12, IRON_ORE: 13, SNOW: 14, GLASS: 15,
  DIAMOND_ORE: 16, GOLD_ORE: 17, CRAFTING_TABLE: 18
};

// Item types (tools, materials, etc.)
const ITEM = {
  COAL: 100, IRON_INGOT: 101, GOLD_INGOT: 102, DIAMOND: 103, STICK: 104,
  WOODEN_PICKAXE: 200, STONE_PICKAXE: 201, IRON_PICKAXE: 202, DIAMOND_PICKAXE: 203, GOLD_PICKAXE: 204,
  WOODEN_AXE: 210, STONE_AXE: 211, IRON_AXE: 212, DIAMOND_AXE: 213,
  WOODEN_SHOVEL: 220, STONE_SHOVEL: 221, IRON_SHOVEL: 222, DIAMOND_SHOVEL: 223,
  WOODEN_SWORD: 230, STONE_SWORD: 231, IRON_SWORD: 232, DIAMOND_SWORD: 233
};

// Block data with hardness
const BLOCK_DATA = {
  [BLOCK.GRASS]:    { name: 'Grass',       hardness: 0.9,  top: 0x7cba3d, side: 0x8b6914, bottom: 0x6b4423, solid: true, toolType: 'shovel' },
  [BLOCK.DIRT]:     { name: 'Dirt',        hardness: 0.75, top: 0x8b6914, side: 0x8b6914, bottom: 0x8b6914, solid: true, toolType: 'shovel' },
  [BLOCK.STONE]:    { name: 'Stone',       hardness: 7.5,  top: 0x7f7f7f, side: 0x7f7f7f, bottom: 0x7f7f7f, solid: true, toolType: 'pickaxe', minTool: 'wooden' },
  [BLOCK.WOOD]:     { name: 'Oak Log',     hardness: 2.0,  top: 0x9c7f4a, side: 0x5b3413, bottom: 0x9c7f4a, solid: true, toolType: 'axe' },
  [BLOCK.LEAVES]:   { name: 'Leaves',      hardness: 0.2,  top: 0x3d8c40, side: 0x3d8c40, bottom: 0x3d8c40, solid: true },
  [BLOCK.SAND]:     { name: 'Sand',        hardness: 0.75, top: 0xdbd3a0, side: 0xdbd3a0, bottom: 0xdbd3a0, solid: true, toolType: 'shovel' },
  /* [BLOCK.WATER]:    { name: 'Water',       hardness: -1,   top: 0x3498db, side: 0x3498db, bottom: 0x3498db, solid: false, transparent: true }, */
  [BLOCK.COBBLE]:   { name: 'Cobblestone', hardness: 10.0, top: 0x6a6a6a, side: 0x6a6a6a, bottom: 0x6a6a6a, solid: true, toolType: 'pickaxe', minTool: 'wooden' },
  [BLOCK.PLANKS]:   { name: 'Oak Planks',  hardness: 2.0,  top: 0xb8945f, side: 0xb8945f, bottom: 0xb8945f, solid: true, toolType: 'axe' },
  [BLOCK.BEDROCK]:  { name: 'Bedrock',     hardness: -1,   top: 0x333333, side: 0x333333, bottom: 0x333333, solid: true },
  [BLOCK.GRAVEL]:   { name: 'Gravel',      hardness: 0.9,  top: 0x7a7a7a, side: 0x7a7a7a, bottom: 0x7a7a7a, solid: true, toolType: 'shovel' },
  [BLOCK.COAL_ORE]: { name: 'Coal Ore',    hardness: 4.5,  top: 0x4a4a4a, side: 0x4a4a4a, bottom: 0x4a4a4a, solid: true, toolType: 'pickaxe', minTool: 'wooden', drops: ITEM.COAL },
  [BLOCK.IRON_ORE]: { name: 'Iron Ore',    hardness: 4.5,  top: 0x8a7560, side: 0x8a7560, bottom: 0x8a7560, solid: true, toolType: 'pickaxe', minTool: 'stone' },
  [BLOCK.SNOW]:     { name: 'Snow',        hardness: 0.15, top: 0xf0f0f0, side: 0xe8e8e8, bottom: 0xdedede, solid: true, toolType: 'shovel' },
  [BLOCK.GLASS]:    { name: 'Glass',       hardness: 0.45, top: 0xc8e8ff, side: 0xc8e8ff, bottom: 0xc8e8ff, solid: true, transparent: true, drops: null },
  [BLOCK.DIAMOND_ORE]: { name: 'Diamond Ore', hardness: 4.5, top: 0x4aedd9, side: 0x4aedd9, bottom: 0x4aedd9, solid: true, toolType: 'pickaxe', minTool: 'iron', drops: ITEM.DIAMOND },
  [BLOCK.GOLD_ORE]: { name: 'Gold Ore',    hardness: 4.5,  top: 0xfcee4b, side: 0xfcee4b, bottom: 0xfcee4b, solid: true, toolType: 'pickaxe', minTool: 'iron' },
  [BLOCK.CRAFTING_TABLE]: { name: 'Crafting Table', hardness: 2.5, top: 0xbc9862, side: 0x9c7f4a, bottom: 0xb8945f, solid: true, toolType: 'axe' }
};

// Item data
const ITEM_DATA = {
  [ITEM.COAL]:       { name: 'Coal',       color: 0x333333, stackable: true },
  [ITEM.IRON_INGOT]: { name: 'Iron Ingot', color: 0xd8d8d8, stackable: true },
  [ITEM.GOLD_INGOT]: { name: 'Gold Ingot', color: 0xfcee4b, stackable: true },
  [ITEM.DIAMOND]:    { name: 'Diamond',    color: 0x4aedd9, stackable: true },
  [ITEM.STICK]:      { name: 'Stick',      color: 0x8b6914, stackable: true },
  [ITEM.WOODEN_PICKAXE]:  { name: 'Wooden Pickaxe',  color: 0x8b6914, durability: 60,  miningSpeed: 2, toolType: 'pickaxe', toolTier: 'wooden', isTool: true },
  [ITEM.STONE_PICKAXE]:   { name: 'Stone Pickaxe',   color: 0x7f7f7f, durability: 132, miningSpeed: 4, toolType: 'pickaxe', toolTier: 'stone', isTool: true },
  [ITEM.IRON_PICKAXE]:    { name: 'Iron Pickaxe',    color: 0xd8d8d8, durability: 251, miningSpeed: 6, toolType: 'pickaxe', toolTier: 'iron', isTool: true },
  [ITEM.DIAMOND_PICKAXE]: { name: 'Diamond Pickaxe', color: 0x4aedd9, durability: 1562, miningSpeed: 8, toolType: 'pickaxe', toolTier: 'diamond', isTool: true },
  [ITEM.GOLD_PICKAXE]:    { name: 'Gold Pickaxe',    color: 0xfcee4b, durability: 33,  miningSpeed: 12, toolType: 'pickaxe', toolTier: 'gold', isTool: true },
  [ITEM.WOODEN_AXE]:  { name: 'Wooden Axe',  color: 0x8b6914, durability: 60,  miningSpeed: 2, toolType: 'axe', toolTier: 'wooden', isTool: true },
  [ITEM.STONE_AXE]:   { name: 'Stone Axe',   color: 0x7f7f7f, durability: 132, miningSpeed: 4, toolType: 'axe', toolTier: 'stone', isTool: true },
  [ITEM.IRON_AXE]:    { name: 'Iron Axe',    color: 0xd8d8d8, durability: 251, miningSpeed: 6, toolType: 'axe', toolTier: 'iron', isTool: true },
  [ITEM.DIAMOND_AXE]: { name: 'Diamond Axe', color: 0x4aedd9, durability: 1562, miningSpeed: 8, toolType: 'axe', toolTier: 'diamond', isTool: true },
  [ITEM.WOODEN_SHOVEL]:  { name: 'Wooden Shovel',  color: 0x8b6914, durability: 60,  miningSpeed: 2, toolType: 'shovel', toolTier: 'wooden', isTool: true },
  [ITEM.STONE_SHOVEL]:   { name: 'Stone Shovel',   color: 0x7f7f7f, durability: 132, miningSpeed: 4, toolType: 'shovel', toolTier: 'stone', isTool: true },
  [ITEM.IRON_SHOVEL]:    { name: 'Iron Shovel',    color: 0xd8d8d8, durability: 251, miningSpeed: 6, toolType: 'shovel', toolTier: 'iron', isTool: true },
  [ITEM.DIAMOND_SHOVEL]: { name: 'Diamond Shovel', color: 0x4aedd9, durability: 1562, miningSpeed: 8, toolType: 'shovel', toolTier: 'diamond', isTool: true },
  [ITEM.WOODEN_SWORD]: { name: 'Wooden Sword', color: 0x8b6914, durability: 60,  damage: 4, isTool: true },
  [ITEM.STONE_SWORD]:  { name: 'Stone Sword',  color: 0x7f7f7f, durability: 132, damage: 5, isTool: true },
  [ITEM.IRON_SWORD]:   { name: 'Iron Sword',   color: 0xd8d8d8, durability: 251, damage: 6, isTool: true },
  [ITEM.DIAMOND_SWORD]:{ name: 'Diamond Sword',color: 0x4aedd9, durability: 1562, damage: 7, isTool: true }
};

const TOOL_TIERS = ['wooden', 'stone', 'iron', 'diamond', 'gold'];

const RECIPES = [
  { result: BLOCK.PLANKS, resultCount: 4, ingredients: [{ item: BLOCK.WOOD, count: 1 }], name: 'Oak Planks' },
  { result: ITEM.STICK, resultCount: 4, ingredients: [{ item: BLOCK.PLANKS, count: 2 }], name: 'Sticks' },
  { result: BLOCK.CRAFTING_TABLE, resultCount: 1, ingredients: [{ item: BLOCK.PLANKS, count: 4 }], name: 'Crafting Table' },
  { result: ITEM.WOODEN_PICKAXE, resultCount: 1, ingredients: [{ item: BLOCK.PLANKS, count: 3 }, { item: ITEM.STICK, count: 2 }], name: 'Wooden Pickaxe' },
  { result: ITEM.WOODEN_AXE, resultCount: 1, ingredients: [{ item: BLOCK.PLANKS, count: 3 }, { item: ITEM.STICK, count: 2 }], name: 'Wooden Axe' },
  { result: ITEM.WOODEN_SHOVEL, resultCount: 1, ingredients: [{ item: BLOCK.PLANKS, count: 1 }, { item: ITEM.STICK, count: 2 }], name: 'Wooden Shovel' },
  { result: ITEM.WOODEN_SWORD, resultCount: 1, ingredients: [{ item: BLOCK.PLANKS, count: 2 }, { item: ITEM.STICK, count: 1 }], name: 'Wooden Sword' },
  { result: ITEM.STONE_PICKAXE, resultCount: 1, ingredients: [{ item: BLOCK.COBBLE, count: 3 }, { item: ITEM.STICK, count: 2 }], name: 'Stone Pickaxe' },
  { result: ITEM.STONE_AXE, resultCount: 1, ingredients: [{ item: BLOCK.COBBLE, count: 3 }, { item: ITEM.STICK, count: 2 }], name: 'Stone Axe' },
  { result: ITEM.STONE_SHOVEL, resultCount: 1, ingredients: [{ item: BLOCK.COBBLE, count: 1 }, { item: ITEM.STICK, count: 2 }], name: 'Stone Shovel' },
  { result: ITEM.STONE_SWORD, resultCount: 1, ingredients: [{ item: BLOCK.COBBLE, count: 2 }, { item: ITEM.STICK, count: 1 }], name: 'Stone Sword' },
  { result: ITEM.IRON_PICKAXE, resultCount: 1, ingredients: [{ item: ITEM.IRON_INGOT, count: 3 }, { item: ITEM.STICK, count: 2 }], name: 'Iron Pickaxe' },
  { result: ITEM.IRON_AXE, resultCount: 1, ingredients: [{ item: ITEM.IRON_INGOT, count: 3 }, { item: ITEM.STICK, count: 2 }], name: 'Iron Axe' },
  { result: ITEM.IRON_SHOVEL, resultCount: 1, ingredients: [{ item: ITEM.IRON_INGOT, count: 1 }, { item: ITEM.STICK, count: 2 }], name: 'Iron Shovel' },
  { result: ITEM.IRON_SWORD, resultCount: 1, ingredients: [{ item: ITEM.IRON_INGOT, count: 2 }, { item: ITEM.STICK, count: 1 }], name: 'Iron Sword' },
  { result: ITEM.DIAMOND_PICKAXE, resultCount: 1, ingredients: [{ item: ITEM.DIAMOND, count: 3 }, { item: ITEM.STICK, count: 2 }], name: 'Diamond Pickaxe' },
  { result: ITEM.DIAMOND_AXE, resultCount: 1, ingredients: [{ item: ITEM.DIAMOND, count: 3 }, { item: ITEM.STICK, count: 2 }], name: 'Diamond Axe' },
  { result: ITEM.DIAMOND_SHOVEL, resultCount: 1, ingredients: [{ item: ITEM.DIAMOND, count: 1 }, { item: ITEM.STICK, count: 2 }], name: 'Diamond Shovel' },
  { result: ITEM.DIAMOND_SWORD, resultCount: 1, ingredients: [{ item: ITEM.DIAMOND, count: 2 }, { item: ITEM.STICK, count: 1 }], name: 'Diamond Sword' },
  { result: ITEM.IRON_INGOT, resultCount: 1, ingredients: [{ item: BLOCK.IRON_ORE, count: 1 }, { item: ITEM.COAL, count: 1 }], name: 'Smelt Iron' },
  { result: ITEM.GOLD_INGOT, resultCount: 1, ingredients: [{ item: BLOCK.GOLD_ORE, count: 1 }, { item: ITEM.COAL, count: 1 }], name: 'Smelt Gold' },
  { result: BLOCK.GLASS, resultCount: 1, ingredients: [{ item: BLOCK.SAND, count: 1 }, { item: ITEM.COAL, count: 1 }], name: 'Smelt Glass' },
  { result: BLOCK.STONE, resultCount: 1, ingredients: [{ item: BLOCK.COBBLE, count: 1 }, { item: ITEM.COAL, count: 1 }], name: 'Smelt Stone' }
];

const FACE_DATA = {
  top:    { dir: [0,1,0],  shade: 1.0, corners: [{pos:[0,1,0],neighbors:[[-1,1,0],[0,1,-1],[-1,1,-1]]},{pos:[0,1,1],neighbors:[[-1,1,0],[0,1,1],[-1,1,1]]},{pos:[1,1,1],neighbors:[[1,1,0],[0,1,1],[1,1,1]]},{pos:[1,1,0],neighbors:[[1,1,0],[0,1,-1],[1,1,-1]]}]},
  bottom: { dir: [0,-1,0], shade: 0.5, corners: [{pos:[0,0,1],neighbors:[[-1,-1,0],[0,-1,1],[-1,-1,1]]},{pos:[0,0,0],neighbors:[[-1,-1,0],[0,-1,-1],[-1,-1,-1]]},{pos:[1,0,0],neighbors:[[1,-1,0],[0,-1,-1],[1,-1,-1]]},{pos:[1,0,1],neighbors:[[1,-1,0],[0,-1,1],[1,-1,1]]}]},
  front:  { dir: [0,0,1],  shade: 0.7, corners: [{pos:[0,0,1],neighbors:[[-1,0,1],[0,-1,1],[-1,-1,1]]},{pos:[1,0,1],neighbors:[[1,0,1],[0,-1,1],[1,-1,1]]},{pos:[1,1,1],neighbors:[[1,0,1],[0,1,1],[1,1,1]]},{pos:[0,1,1],neighbors:[[-1,0,1],[0,1,1],[-1,1,1]]}]},
  back:   { dir: [0,0,-1], shade: 0.7, corners: [{pos:[1,0,0],neighbors:[[1,0,-1],[0,-1,-1],[1,-1,-1]]},{pos:[0,0,0],neighbors:[[-1,0,-1],[0,-1,-1],[-1,-1,-1]]},{pos:[0,1,0],neighbors:[[-1,0,-1],[0,1,-1],[-1,1,-1]]},{pos:[1,1,0],neighbors:[[1,0,-1],[0,1,-1],[1,1,-1]]}]},
  right:  { dir: [1,0,0],  shade: 0.85,corners: [{pos:[1,0,0],neighbors:[[1,0,-1],[1,-1,0],[1,-1,-1]]},{pos:[1,1,0],neighbors:[[1,0,-1],[1,1,0],[1,1,-1]]},{pos:[1,1,1],neighbors:[[1,0,1],[1,1,0],[1,1,1]]},{pos:[1,0,1],neighbors:[[1,0,1],[1,-1,0],[1,-1,1]]}]},
  left:   { dir: [-1,0,0], shade: 0.65,corners: [{pos:[0,0,1],neighbors:[[-1,0,1],[-1,-1,0],[-1,-1,1]]},{pos:[0,1,1],neighbors:[[-1,0,1],[-1,1,0],[-1,1,1]]},{pos:[0,1,0],neighbors:[[-1,0,-1],[-1,1,0],[-1,1,-1]]},{pos:[0,0,0],neighbors:[[-1,0,-1],[-1,-1,0],[-1,-1,-1]]}]}
};
