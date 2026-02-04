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

const BLOCK_TYPE = {
  CUBE: 0,
  CROSS: 1
};

// Block types
const BLOCK = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4, LEAVES: 5,
  SAND: 6, /*WATER: 7,*/ COBBLE: 8, PLANKS: 9, BEDROCK: 10,
  GRAVEL: 11, COAL_ORE: 12, IRON_ORE: 13, SNOW: 14, GLASS: 15,
  DIAMOND_ORE: 16, GOLD_ORE: 17, CRAFTING_TABLE: 18,
  TALL_GRASS: 30,
  FLOWER_RED: 31,
  FLOWER_YELLOW: 32,
  FLOWER_BLUE: 33,
  DEAD_BUSH: 34,
  SAPLING: 35
};

// Item types (tools, materials, etc.)
const ITEM = {
  COAL: 100, IRON_INGOT: 101, GOLD_INGOT: 102, DIAMOND: 103, STICK: 104,
  WOODEN_PICKAXE: 200, STONE_PICKAXE: 201, IRON_PICKAXE: 202, DIAMOND_PICKAXE: 203, GOLD_PICKAXE: 204,
  WOODEN_AXE: 210, STONE_AXE: 211, IRON_AXE: 212, DIAMOND_AXE: 213,
  WOODEN_SHOVEL: 220, STONE_SHOVEL: 221, IRON_SHOVEL: 222, DIAMOND_SHOVEL: 223,
  WOODEN_SWORD: 230, STONE_SWORD: 231, IRON_SWORD: 232, DIAMOND_SWORD: 233
};

// ==================== TEXTURE ATLAS CONFIG ====================

const ATLAS_SIZE = 16;  // 16x16 grid of textures
const TILE_SIZE = 1 / ATLAS_SIZE;  // UV size of one tile (0.0625)

// Texture positions in atlas [column, row] (0-indexed from bottom-left)
// Row 0 is BOTTOM of image, Row 15 is TOP
const TEX = {
  // Basic blocks
  GRASS_TOP:      [0, 15],
  GRASS_SIDE:     [1, 15],
  DIRT:           [2, 15],
  STONE:          [3, 15],
  COBBLESTONE:    [4, 15],
  BEDROCK:        [5, 15],
  SAND:           [6, 15],
  GRAVEL:         [7, 15],
  SNOW:           [8, 15],
  
  // Wood and trees
  WOOD_SIDE:      [0, 14],
  WOOD_TOP:       [1, 14],
  LEAVES:         [2, 14],
  PLANKS:         [3, 14],
  
  // Ores
  COAL_ORE:       [0, 13],
  IRON_ORE:       [1, 13],
  GOLD_ORE:       [2, 13],
  DIAMOND_ORE:    [3, 13],
  
  // Other blocks
  WATER:          [0, 12],
  GLASS:          [1, 12],
  BRICK:          [2, 12],
  BOOKSHELF:      [3, 12],
  
  // Cross-type (flowers, grass)
  TALL_GRASS:     [0, 11],
  FLOWER_RED:     [1, 11],
  FLOWER_YELLOW:  [2, 11],
  FLOWER_BLUE:    [3, 11],
  DEAD_BUSH:      [4, 11],
  SAPLING:        [5, 11],
  
  // Fallback/debug
  MISSING:        [15, 0]
};

// Helper to get UV coordinates for a texture slot
function getTexUV(texSlot) {
  const [col, row] = texSlot;
  return {
    u: col * TILE_SIZE,
    v: row * TILE_SIZE,
    s: TILE_SIZE
  };
}

// Update BLOCK_DATA to include texture references
// Add 'tex' property with { top, side, bottom } texture slots

let BLOCK_DATA = {}

BLOCK_DATA[BLOCK.GRASS] = {
  name: 'Grass',
  type: BLOCK_TYPE.CUBE,
  solid: true,
  transparent: false,
  hardness: 0.6,
  toolType: 'shovel',
  top: 0x7cbd6b,
  side: 0x8b6d4a,
  bottom: 0x8b6d4a,
  tex: {
    top: TEX.GRASS_TOP,
    side: TEX.GRASS_SIDE,
    bottom: TEX.DIRT
  },
  drops: BLOCK.DIRT
};

BLOCK_DATA[BLOCK.DIRT] = {
  name: 'Dirt',
  type: BLOCK_TYPE.CUBE,
  solid: true,
  transparent: false,
  hardness: 0.5,
  toolType: 'shovel',
  top: 0x8b6d4a,
  side: 0x8b6d4a,
  bottom: 0x8b6d4a,
  tex: {
    top: TEX.DIRT,
    side: TEX.DIRT,
    bottom: TEX.DIRT
  }
};

BLOCK_DATA[BLOCK.STONE] = {
  name: 'Stone',
  type: BLOCK_TYPE.CUBE,
  solid: true,
  transparent: false,
  hardness: 1.5,
  toolType: 'pickaxe',
  minTool: 'wood',
  top: 0x8a8a8a,
  side: 0x8a8a8a,
  bottom: 0x8a8a8a,
  tex: {
    top: TEX.STONE,
    side: TEX.STONE,
    bottom: TEX.STONE
  },
  drops: BLOCK.COBBLE
};

BLOCK_DATA[BLOCK.COBBLE] = {
  name: 'Cobblestone',
  type: BLOCK_TYPE.CUBE,
  solid: true,
  transparent: false,
  hardness: 2.0,
  toolType: 'pickaxe',
  minTool: 'wood',
  top: 0x7a7a7a,
  side: 0x7a7a7a,
  bottom: 0x7a7a7a,
  tex: {
    top: TEX.COBBLESTONE,
    side: TEX.COBBLESTONE,
    bottom: TEX.COBBLESTONE
  }
};

BLOCK_DATA[BLOCK.BEDROCK] = {
  name: 'Bedrock',
  type: BLOCK_TYPE.CUBE,
  solid: true,
  transparent: false,
  hardness: -1,
  top: 0x3a3a3a,
  side: 0x3a3a3a,
  bottom: 0x3a3a3a,
  tex: {
    top: TEX.BEDROCK,
    side: TEX.BEDROCK,
    bottom: TEX.BEDROCK
  }
};

BLOCK_DATA[BLOCK.SAND] = {
  name: 'Sand',
  type: BLOCK_TYPE.CUBE,
  solid: true,
  transparent: false,
  hardness: 0.5,
  toolType: 'shovel',
  top: 0xdbd3a0,
  side: 0xdbd3a0,
  bottom: 0xdbd3a0,
  tex: {
    top: TEX.SAND,
    side: TEX.SAND,
    bottom: TEX.SAND
  }
};

BLOCK_DATA[BLOCK.WOOD] = {
  name: 'Wood',
  type: BLOCK_TYPE.CUBE,
  solid: true,
  transparent: false,
  hardness: 2.0,
  toolType: 'axe',
  top: 0x9a7d4a,
  side: 0x6b5030,
  bottom: 0x9a7d4a,
  tex: {
    top: TEX.WOOD_TOP,
    side: TEX.WOOD_SIDE,
    bottom: TEX.WOOD_TOP
  }
};

BLOCK_DATA[BLOCK.LEAVES] = {
  name: 'Leaves',
  type: BLOCK_TYPE.CUBE,
  solid: true,
  transparent: true,
  hardness: 0.2,
  top: 0x3a5f0b,
  side: 0x3a5f0b,
  bottom: 0x3a5f0b,
  tex: {
    top: TEX.LEAVES,
    side: TEX.LEAVES,
    bottom: TEX.LEAVES
  },
  drops: null,
  rareDrops: { item: BLOCK.SAPLING, chance: 0.05 }
};

BLOCK_DATA[BLOCK.PLANKS] = {
  name: 'Planks',
  type: BLOCK_TYPE.CUBE,
  solid: true,
  transparent: false,
  hardness: 2.0,
  toolType: 'axe',
  top: 0xbc9862,
  side: 0xbc9862,
  bottom: 0xbc9862,
  tex: {
    top: TEX.PLANKS,
    side: TEX.PLANKS,
    bottom: TEX.PLANKS
  }
};

BLOCK_DATA[BLOCK.GLASS] = {
  name: 'Glass',
  type: BLOCK_TYPE.CUBE,
  solid: true,
  transparent: true,
  hardness: 0.3,
  top: 0xc8e4f8,
  side: 0xc8e4f8,
  bottom: 0xc8e4f8,
  tex: {
    top: TEX.GLASS,
    side: TEX.GLASS,
    bottom: TEX.GLASS
  },
  drops: null
};

BLOCK_DATA[BLOCK.WATER] = {
  name: 'Water',
  type: BLOCK_TYPE.CUBE,
  solid: false,
  transparent: true,
  hardness: -1,
  top: 0x3080c0,
  side: 0x3080c0,
  bottom: 0x3080c0,
  tex: {
    top: TEX.WATER,
    side: TEX.WATER,
    bottom: TEX.WATER
  }
};

BLOCK_DATA[BLOCK.COAL_ORE] = {
  name: 'Coal Ore',
  type: BLOCK_TYPE.CUBE,
  solid: true,
  transparent: false,
  hardness: 3.0,
  toolType: 'pickaxe',
  minTool: 'wood',
  top: 0x5a5a5a,
  side: 0x5a5a5a,
  bottom: 0x5a5a5a,
  tex: {
    top: TEX.COAL_ORE,
    side: TEX.COAL_ORE,
    bottom: TEX.COAL_ORE
  },
  drops: ITEM.COAL
};

BLOCK_DATA[BLOCK.IRON_ORE] = {
  name: 'Iron Ore',
  type: BLOCK_TYPE.CUBE,
  solid: true,
  transparent: false,
  hardness: 3.0,
  toolType: 'pickaxe',
  minTool: 'stone',
  top: 0x8a7a6a,
  side: 0x8a7a6a,
  bottom: 0x8a7a6a,
  tex: {
    top: TEX.IRON_ORE,
    side: TEX.IRON_ORE,
    bottom: TEX.IRON_ORE
  }
};

BLOCK_DATA[BLOCK.GOLD_ORE] = {
  name: 'Gold Ore',
  type: BLOCK_TYPE.CUBE,
  solid: true,
  transparent: false,
  hardness: 3.0,
  toolType: 'pickaxe',
  minTool: 'iron',
  top: 0x8a8a5a,
  side: 0x8a8a5a,
  bottom: 0x8a8a5a,
  tex: {
    top: TEX.GOLD_ORE,
    side: TEX.GOLD_ORE,
    bottom: TEX.GOLD_ORE
  }
};

BLOCK_DATA[BLOCK.DIAMOND_ORE] = {
  name: 'Diamond Ore',
  type: BLOCK_TYPE.CUBE,
  solid: true,
  transparent: false,
  hardness: 3.0,
  toolType: 'pickaxe',
  minTool: 'iron',
  top: 0x5a8a8a,
  side: 0x5a8a8a,
  bottom: 0x5a8a8a,
  tex: {
    top: TEX.DIAMOND_ORE,
    side: TEX.DIAMOND_ORE,
    bottom: TEX.DIAMOND_ORE
  },
  drops: ITEM.DIAMOND
};

BLOCK_DATA[BLOCK.SNOW] = {
  name: 'Snow',
  type: BLOCK_TYPE.CUBE,
  solid: true,
  transparent: false,
  hardness: 0.2,
  toolType: 'shovel',
  top: 0xf0f0f0,
  side: 0xf0f0f0,
  bottom: 0xf0f0f0,
  tex: {
    top: TEX.SNOW,
    side: TEX.SNOW,
    bottom: TEX.SNOW
  }
};

// Cross-type blocks with textures
BLOCK_DATA[BLOCK.TALL_GRASS] = {
  name: 'Tall Grass',
  type: BLOCK_TYPE.CROSS,
  solid: false,
  transparent: true,
  hardness: 0.01,
  color: 0x5d8c3a,
  top: 0x5d8c3a,
  side: 0x5d8c3a,
  bottom: 0x5d8c3a,
  tex: { side: TEX.TALL_GRASS },
  drops: null,
  rareDrops: { item: BLOCK.SAPLING, chance: 0.05 },
  placedOn: [BLOCK.GRASS, BLOCK.DIRT]
};

BLOCK_DATA[BLOCK.FLOWER_RED] = {
  name: 'Red Flower',
  type: BLOCK_TYPE.CROSS,
  solid: false,
  transparent: true,
  hardness: 0.01,
  color: 0xff4444,
  top: 0xff4444,
  side: 0xff4444,
  bottom: 0xff4444,
  tex: { side: TEX.FLOWER_RED },
  placedOn: [BLOCK.GRASS, BLOCK.DIRT]
};

BLOCK_DATA[BLOCK.FLOWER_YELLOW] = {
  name: 'Yellow Flower',
  type: BLOCK_TYPE.CROSS,
  solid: false,
  transparent: true,
  hardness: 0.01,
  color: 0xffdd44,
  top: 0xffdd44,
  side: 0xffdd44,
  bottom: 0xffdd44,
  tex: { side: TEX.FLOWER_YELLOW },
  placedOn: [BLOCK.GRASS, BLOCK.DIRT]
};

BLOCK_DATA[BLOCK.FLOWER_BLUE] = {
  name: 'Blue Flower',
  type: BLOCK_TYPE.CROSS,
  solid: false,
  transparent: true,
  hardness: 0.01,
  color: 0x4488ff,
  top: 0x4488ff,
  side: 0x4488ff,
  bottom: 0x4488ff,
  tex: { side: TEX.FLOWER_BLUE },
  placedOn: [BLOCK.GRASS, BLOCK.DIRT]
};

BLOCK_DATA[BLOCK.DEAD_BUSH] = {
  name: 'Dead Bush',
  type: BLOCK_TYPE.CROSS,
  solid: false,
  transparent: true,
  hardness: 0.01,
  color: 0x8b6914,
  top: 0x8b6914,
  side: 0x8b6914,
  bottom: 0x8b6914,
  tex: { side: TEX.DEAD_BUSH },
  drops: null,
  placedOn: [BLOCK.SAND]
};

BLOCK_DATA[BLOCK.SAPLING] = {
  name: 'Sapling',
  type: BLOCK_TYPE.CROSS,
  solid: false,
  transparent: true,
  hardness: 0.01,
  color: 0x2d5a1d,
  top: 0x2d5a1d,
  side: 0x2d5a1d,
  bottom: 0x2d5a1d,
  tex: { side: TEX.SAPLING },
  placedOn: [BLOCK.GRASS, BLOCK.DIRT]
};

const FACE_DATA = {
  top:    { dir: [0,1,0],  shade: 1.0, corners: [{pos:[0,1,0],neighbors:[[-1,1,0],[0,1,-1],[-1,1,-1]]},{pos:[0,1,1],neighbors:[[-1,1,0],[0,1,1],[-1,1,1]]},{pos:[1,1,1],neighbors:[[1,1,0],[0,1,1],[1,1,1]]},{pos:[1,1,0],neighbors:[[1,1,0],[0,1,-1],[1,1,-1]]}]},
  bottom: { dir: [0,-1,0], shade: 0.5, corners: [{pos:[0,0,1],neighbors:[[-1,-1,0],[0,-1,1],[-1,-1,1]]},{pos:[0,0,0],neighbors:[[-1,-1,0],[0,-1,-1],[-1,-1,-1]]},{pos:[1,0,0],neighbors:[[1,-1,0],[0,-1,-1],[1,-1,-1]]},{pos:[1,0,1],neighbors:[[1,-1,0],[0,-1,1],[1,-1,1]]}]},
  front:  { dir: [0,0,1],  shade: 0.7, corners: [{pos:[0,0,1],neighbors:[[-1,0,1],[0,-1,1],[-1,-1,1]]},{pos:[1,0,1],neighbors:[[1,0,1],[0,-1,1],[1,-1,1]]},{pos:[1,1,1],neighbors:[[1,0,1],[0,1,1],[1,1,1]]},{pos:[0,1,1],neighbors:[[-1,0,1],[0,1,1],[-1,1,1]]}]},
  back:   { dir: [0,0,-1], shade: 0.7, corners: [{pos:[1,0,0],neighbors:[[1,0,-1],[0,-1,-1],[1,-1,-1]]},{pos:[0,0,0],neighbors:[[-1,0,-1],[0,-1,-1],[-1,-1,-1]]},{pos:[0,1,0],neighbors:[[-1,0,-1],[0,1,-1],[-1,1,-1]]},{pos:[1,1,0],neighbors:[[1,0,-1],[0,1,-1],[1,1,-1]]}]},
  right:  { dir: [1,0,0],  shade: 0.85,corners: [{pos:[1,0,0],neighbors:[[1,0,-1],[1,-1,0],[1,-1,-1]]},{pos:[1,1,0],neighbors:[[1,0,-1],[1,1,0],[1,1,-1]]},{pos:[1,1,1],neighbors:[[1,0,1],[1,1,0],[1,1,1]]},{pos:[1,0,1],neighbors:[[1,0,1],[1,-1,0],[1,-1,1]]}]},
  left:   { dir: [-1,0,0], shade: 0.65,corners: [{pos:[0,0,1],neighbors:[[-1,0,1],[-1,-1,0],[-1,-1,1]]},{pos:[0,1,1],neighbors:[[-1,0,1],[-1,1,0],[-1,1,1]]},{pos:[0,1,0],neighbors:[[-1,0,-1],[-1,1,0],[-1,1,-1]]},{pos:[0,0,0],neighbors:[[-1,0,-1],[-1,-1,0],[-1,-1,-1]]}]}
};

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
