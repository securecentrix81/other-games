// ==================== CHUNK GENERATION WORKER ====================
// This worker handles terrain generation off the main thread

// Import SimplexNoise (inline for worker)
class SimplexNoise {
  constructor(seed = Math.random() * 10000) {
    this.seed = seed;
    this.p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) this.p[i] = i;
    let n = seed;
    for (let i = 255; i > 0; i--) {
      n = ((n * 16807) % 2147483647);
      const j = n % (i + 1);
      [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
    }
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  noise2D(x, y) {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const grad3 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
    let s = (x + y) * F2;
    let i = Math.floor(x + s);
    let j = Math.floor(y + s);
    let t = (i + j) * G2;
    let X0 = i - t, Y0 = j - t;
    let x0 = x - X0, y0 = y - Y0;
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    let x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    let x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    let ii = i & 255, jj = j & 255;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0*x0 - y0*y0;
    if (t0 >= 0) {
      let gi0 = this.permMod12[ii + this.perm[jj]];
      t0 *= t0; n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
    }
    let t1 = 0.5 - x1*x1 - y1*y1;
    if (t1 >= 0) {
      let gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
      t1 *= t1; n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
    }
    let t2 = 0.5 - x2*x2 - y2*y2;
    if (t2 >= 0) {
      let gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
      t2 *= t2; n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
    }
    return 70 * (n0 + n1 + n2);
  }

  octave(x, y, octaves, persistence = 0.5, lacunarity = 2) {
    let total = 0, frequency = 1, amplitude = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return total / maxValue;
  }
}

// Constants (duplicated for worker context)
const CHUNK_SIZE = 16;
const WORLD_HEIGHT = 1000;
const WATER_LEVEL = 0;

const BLOCK = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4, LEAVES: 5,
  SAND: 6, WATER: 7, COBBLE: 8, PLANKS: 9, BEDROCK: 10,
  GRAVEL: 11, COAL_ORE: 12, IRON_ORE: 13, SNOW: 14, GLASS: 15,
  DIAMOND_ORE: 16, GOLD_ORE: 17, CRAFTING_TABLE: 18
};

let noise = null;
let noiseDetail = null;

// Seeded random for tree generation
function seededRandom(x, z, seed) {
  const n = Math.sin(x * 12.9898 + z * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function getTerrainHeight(x, z) {
  const scale = 0.008;
  const detailScale = 0.03;

  let base = noise.octave(x * scale, z * scale, 4, 0.5);
  let detail = noiseDetail.octave(x * detailScale, z * detailScale, 2, 0.5);

  let height = 20 + base * 25 + detail * 5;

  let mountain = noise.octave(x * 0.004, z * 0.004, 3, 0.4);
  if (mountain > 0.3) {
    height += (mountain - 0.3) * 60;
  }

  return Math.floor(height);
}

function getBiome(x, z) {
  const temp = noise.noise2D(x * 0.002, z * 0.002);
  const moisture = noiseDetail.noise2D(x * 0.003, z * 0.003);

  if (temp > 0.4) return 'desert';
  if (temp < -0.4) return 'snow';
  if (moisture > 0.3) return 'forest';
  return 'plains';
}

function generateChunkData(cx, cz, seed) {
  if (!noise) {
    noise = new SimplexNoise(seed);
    noiseDetail = new SimplexNoise(seed + 1000);
  }

  const chunk = new Uint8Array(CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE);
  const trees = []; // Store tree positions for later processing

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wx = cx * CHUNK_SIZE + lx;
      const wz = cz * CHUNK_SIZE + lz;
      const height = getTerrainHeight(wx, wz);
      const biome = getBiome(wx, wz);

      for (let y = 0; y < WORLD_HEIGHT; y++) {
        const idx = lx + y * CHUNK_SIZE + lz * CHUNK_SIZE * WORLD_HEIGHT;

        if (y === 0) {
          chunk[idx] = BLOCK.BEDROCK;
        } else if (y < height - 4) {
          const rand = seededRandom(wx, y * 1000 + wz, seed);
          if (rand < 0.008) chunk[idx] = BLOCK.COAL_ORE;
          else if (rand < 0.012 && y < 40) chunk[idx] = BLOCK.IRON_ORE;
          else if (rand < 0.014 && y < 20) chunk[idx] = BLOCK.GOLD_ORE;
          else if (rand < 0.016 && y < 16) chunk[idx] = BLOCK.DIAMOND_ORE;
          else chunk[idx] = BLOCK.STONE;
        } else if (y < height - 1) {
          chunk[idx] = biome === 'desert' ? BLOCK.SAND : BLOCK.DIRT;
        } else if (y < height) {
          if (biome === 'desert') chunk[idx] = BLOCK.SAND;
          else if (biome === 'snow') chunk[idx] = BLOCK.SNOW;
          else if (height <= WATER_LEVEL + 2) chunk[idx] = BLOCK.SAND;
          else chunk[idx] = BLOCK.GRASS;
        } else if (y <= WATER_LEVEL) {
          chunk[idx] = BLOCK.WATER;
        }
      }

      // Tree check
      if (height > WATER_LEVEL + 2 && biome !== 'desert') {
        const treeRand = seededRandom(wx, wz, seed + 5000);
        if (treeRand < 0.015) {
          trees.push({ lx, lz, height });
        }
      }
    }
  }

  // Generate trees
  for (const tree of trees) {
    const { lx, lz, height } = tree;
    const treeHeight = 4 + Math.floor(seededRandom(lx, lz, seed + 9999) * 2);
    
    // Trunk
    for (let ty = 0; ty < treeHeight; ty++) {
      const y = height + ty;
      if (y < WORLD_HEIGHT) {
        chunk[lx + y * CHUNK_SIZE + lz * CHUNK_SIZE * WORLD_HEIGHT] = BLOCK.WOOD;
      }
    }
    
    // Leaves
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = treeHeight - 1; dy <= treeHeight + 1; dy++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && seededRandom(dx + lx, dz + lz, seed) > 0.5) continue;
          const nx = lx + dx, nz = lz + dz, ny = height + dy;
          if (nx >= 0 && nx < CHUNK_SIZE && nz >= 0 && nz < CHUNK_SIZE && ny < WORLD_HEIGHT) {
            if (chunk[nx + ny * CHUNK_SIZE + nz * CHUNK_SIZE * WORLD_HEIGHT] === BLOCK.AIR) {
              chunk[nx + ny * CHUNK_SIZE + nz * CHUNK_SIZE * WORLD_HEIGHT] = BLOCK.LEAVES;
            }
          }
        }
      }
    }
  }

  return chunk;
}

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, cx, cz, seed, id } = e.data;
  
  if (type === 'generate') {
    const chunkData = generateChunkData(cx, cz, seed);
    
    // Transfer the ArrayBuffer for performance
    self.postMessage({
      type: 'chunk',
      id: id,
      cx: cx,
      cz: cz,
      data: chunkData.buffer
    }, [chunkData.buffer]);
  } else if (type === 'init') {
    noise = new SimplexNoise(seed);
    noiseDetail = new SimplexNoise(seed + 1000);
    self.postMessage({ type: 'ready' });
  }
};
