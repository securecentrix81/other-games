// ==================== CHUNK GENERATION WORKER ====================
// This worker handles terrain generation AND mesh geometry building

importScripts('../noise.js');
importScripts('../constants.js');

let noise = null;
let noiseDetail = null;
let currentSeed = null;

// Seeded random for deterministic generation
function seededRandom(x, z, seed) {
  const n = Math.sin(x * 12.9898 + z * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function seededRandom3D(x, y, z, seed) {
  const n = Math.sin(x * 12.9898 + y * 4.1414 + z * 78.233 + seed) * 43758.5453;
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
  if (!noise || currentSeed !== seed) {
    noise = new SimplexNoise(seed);
    noiseDetail = new SimplexNoise(seed + 1000);
    currentSeed = seed;
  }

  const chunk = new Uint8Array(CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE);
  const trees = [];

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
          const rand = seededRandom3D(wx, y, wz, seed);
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

      // Tree placement (deterministic)
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
    const wx = cx * CHUNK_SIZE + lx;
    const wz = cz * CHUNK_SIZE + lz;
    const treeHeight = 4 + Math.floor(seededRandom(wx, wz, seed + 9999) * 2);
    
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
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && seededRandom(dx + wx, dz + wz, seed + 3333) > 0.5) continue;
          const nx = lx + dx, nz = lz + dz, ny = height + dy;
          if (nx >= 0 && nx < CHUNK_SIZE && nz >= 0 && nz < CHUNK_SIZE && ny < WORLD_HEIGHT) {
            const leafIdx = nx + ny * CHUNK_SIZE + nz * CHUNK_SIZE * WORLD_HEIGHT;
            if (chunk[leafIdx] === BLOCK.AIR) {
              chunk[leafIdx] = BLOCK.LEAVES;
            }
          }
        }
      }
    }
  }

  return chunk;
}

// ==================== MESH GEOMETRY BUILDING ====================

function buildMeshGeometry(cx, cz, chunk, neighbors, modifiedBlocks) {
  const opaque = { pos: [], col: [], norm: [] };  // Added norm array
  const trans = { pos: [], col: [], norm: [] };   // Added norm array

  // Helper to get block at world position
  const getBlock = (wx, y, wz) => {
    if (y < 0 || y >= WORLD_HEIGHT) return BLOCK.AIR;
    
    const modKey = `${wx},${y},${wz}`;
    if (modifiedBlocks && modifiedBlocks[modKey] !== undefined) {
      return modifiedBlocks[modKey];
    }
    
    const targetCx = Math.floor(wx / CHUNK_SIZE);
    const targetCz = Math.floor(wz / CHUNK_SIZE);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    
    if (targetCx === cx && targetCz === cz) {
      return chunk[lx + y * CHUNK_SIZE + lz * CHUNK_SIZE * WORLD_HEIGHT];
    }
    
    const nkey = `${targetCx},${targetCz}`;
    if (neighbors[nkey]) {
      return neighbors[nkey][lx + y * CHUNK_SIZE + lz * CHUNK_SIZE * WORLD_HEIGHT];
    }
    
    return BLOCK.AIR;
  };

  const isOccluder = (x, y, z) => {
    const block = getBlock(x, y, z);
    return block !== BLOCK.AIR && BLOCK_DATA[block] && !BLOCK_DATA[block].transparent;
  };

  const vertexAO = (s1, s2, c) => (s1 && s2) ? 0 : 3 - (s1 + s2 + c);
  const aoLevels = [0.5, 0.7, 0.85, 1.0];

  // Face normals - pre-defined for each direction
  const FACE_NORMALS = {
    top:    [0, 1, 0],
    bottom: [0, -1, 0],
    front:  [0, 0, 1],
    back:   [0, 0, -1],
    right:  [1, 0, 0],
    left:   [-1, 0, 0]
  };

  const addFace = (wx, y, wz, dir, color, target) => {
    const r = ((color >> 16) & 255) / 255;
    const g = ((color >> 8) & 255) / 255;
    const b = (color & 255) / 255;

    const face = FACE_DATA[dir];
    const normal = FACE_NORMALS[dir];

    const ao = face.corners.map(c => {
      const n = c.neighbors;
      const s1 = isOccluder(wx + n[0][0], y + n[0][1], wz + n[0][2]) ? 1 : 0;
      const s2 = isOccluder(wx + n[1][0], y + n[1][1], wz + n[1][2]) ? 1 : 0;
      const corner = isOccluder(wx + n[2][0], y + n[2][1], wz + n[2][2]) ? 1 : 0;
      return vertexAO(s1, s2, corner);
    });

    const flip = ao[0] + ao[2] < ao[1] + ao[3];
    const indices = flip ? [1, 2, 3, 1, 3, 0] : [0, 1, 2, 0, 2, 3];

    const noise = (Math.sin(wx * 12.9898 + wz * 78.233) * 43758.5453) % 1;
    const v = 1 - (Math.abs(noise) * 0.08);

    indices.forEach(i => {
      const corner = face.corners[i];
      target.pos.push(wx + corner.pos[0], y + corner.pos[1], wz + corner.pos[2]);
      const m = aoLevels[ao[i]] * face.shade * v;
      target.col.push(r * m, g * m, b * m);
      // Add pre-computed normal for this vertex
      target.norm.push(normal[0], normal[1], normal[2]);
    });
  };

  // ... rest of the iteration logic stays the same ...

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        
        const modKey = `${wx},${y},${wz}`;
        let block;
        if (modifiedBlocks && modifiedBlocks[modKey] !== undefined) {
          block = modifiedBlocks[modKey];
        } else {
          const idx = lx + y * CHUNK_SIZE + lz * CHUNK_SIZE * WORLD_HEIGHT;
          block = chunk[idx];
        }

        if (block === BLOCK.AIR) continue;

        const data = BLOCK_DATA[block];
        if (!data) continue;

        const target = data.transparent ? trans : opaque;

        const shouldRender = (nx, ny, nz) => {
          const neighbor = getBlock(nx, ny, nz);
          if (neighbor === BLOCK.AIR) return true;
          const nData = BLOCK_DATA[neighbor];
          if (!nData) return true;
          if (nData.transparent && !data.transparent) return true;
          if (data.transparent && nData.transparent && neighbor !== block) return true;
          return false;
        };

        if (shouldRender(wx, y + 1, wz)) addFace(wx, y, wz, 'top', data.top, target);
        if (shouldRender(wx, y - 1, wz)) addFace(wx, y, wz, 'bottom', data.bottom, target);
        if (shouldRender(wx, y, wz + 1)) addFace(wx, y, wz, 'front', data.side, target);
        if (shouldRender(wx, y, wz - 1)) addFace(wx, y, wz, 'back', data.side, target);
        if (shouldRender(wx + 1, y, wz)) addFace(wx, y, wz, 'right', data.side, target);
        if (shouldRender(wx - 1, y, wz)) addFace(wx, y, wz, 'left', data.side, target);
      }
    }
  }

  return {
    opaque: {
      positions: new Float32Array(opaque.pos),
      colors: new Float32Array(opaque.col),
      normals: new Float32Array(opaque.norm)  // Added normals
    },
    transparent: {
      positions: new Float32Array(trans.pos),
      colors: new Float32Array(trans.col),
      normals: new Float32Array(trans.norm)   // Added normals
    }
  };
}

// Update message handler to transfer normals
self.onmessage = function(e) {
  const { type, cx, cz, seed, id } = e.data;

  if (type === 'init') {
    noise = new SimplexNoise(seed);
    noiseDetail = new SimplexNoise(seed + 1000);
    currentSeed = seed;
    self.postMessage({ type: 'ready' });
  }
  else if (type === 'generate') {
    const chunkData = generateChunkData(cx, cz, seed);
    self.postMessage({
      type: 'chunk',
      id, cx, cz,
      data: chunkData.buffer
    }, [chunkData.buffer]);
  }
  else if (type === 'generateAndBuild') {
    const { neighbors, modifiedBlocks } = e.data;
    
    const neighborArrays = {};
    if (neighbors) {
      for (const [key, buf] of Object.entries(neighbors)) {
        neighborArrays[key] = new Uint8Array(buf);
      }
    }
    
    const chunkData = generateChunkData(cx, cz, seed);
    const geometry = buildMeshGeometry(cx, cz, chunkData, neighborArrays, modifiedBlocks || {});
    
    // Transfer all buffers including normals
    const transferList = [
      chunkData.buffer,
      geometry.opaque.positions.buffer,
      geometry.opaque.colors.buffer,
      geometry.opaque.normals.buffer,
      geometry.transparent.positions.buffer,
      geometry.transparent.colors.buffer,
      geometry.transparent.normals.buffer
    ];
    
    self.postMessage({
      type: 'chunkWithMesh',
      id, cx, cz,
      chunkData: chunkData.buffer,
      geometry
    }, transferList);
  }
  else if (type === 'buildMesh') {
    const { chunk, neighbors, modifiedBlocks } = e.data;
    
    const chunkArray = new Uint8Array(chunk);
    const neighborArrays = {};
    if (neighbors) {
      for (const [key, buf] of Object.entries(neighbors)) {
        neighborArrays[key] = new Uint8Array(buf);
      }
    }
    
    const geometry = buildMeshGeometry(cx, cz, chunkArray, neighborArrays, modifiedBlocks || {});
    
    // Transfer all buffers including normals
    const transferList = [
      geometry.opaque.positions.buffer,
      geometry.opaque.colors.buffer,
      geometry.opaque.normals.buffer,
      geometry.transparent.positions.buffer,
      geometry.transparent.colors.buffer,
      geometry.transparent.normals.buffer
    ];
    
    self.postMessage({
      type: 'mesh',
      id, cx, cz,
      geometry
    }, transferList);
  }
};
