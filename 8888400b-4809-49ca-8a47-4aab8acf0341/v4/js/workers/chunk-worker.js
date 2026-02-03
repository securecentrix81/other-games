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
  // Generate grass and flowers
  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wx = cx * CHUNK_SIZE + lx;
      const wz = cz * CHUNK_SIZE + lz;
      const height = getTerrainHeight(wx, wz);
      const biome = getBiome(wx, wz);
      
      // Skip if underwater
      if (height <= WATER_LEVEL) continue;
      
      const surfaceIdx = lx + height * CHUNK_SIZE + lz * CHUNK_SIZE * WORLD_HEIGHT;
      const aboveIdx = lx + (height + 1) * CHUNK_SIZE + lz * CHUNK_SIZE * WORLD_HEIGHT;
      
      // Only place on grass or sand, and only if above is air
      const surfaceBlock = chunk[surfaceIdx];
      if (chunk[aboveIdx] !== BLOCK.AIR) continue;
      
      const rand = seededRandom(wx + 1000, wz + 1000, seed);
      
      if (surfaceBlock === BLOCK.GRASS) {
        // Plains and forest get tall grass and flowers
        if (biome === 'plains' || biome === 'forest') {
          if (rand < 0.15) {
            // 15% chance for tall grass
            chunk[aboveIdx] = BLOCK.TALL_GRASS;
          } else if (rand < 0.18) {
            // 3% chance for flowers
            const flowerRand = seededRandom(wx + 2000, wz + 2000, seed);
            if (flowerRand < 0.33) {
              chunk[aboveIdx] = BLOCK.FLOWER_RED;
            } else if (flowerRand < 0.66) {
              chunk[aboveIdx] = BLOCK.FLOWER_YELLOW;
            } else {
              chunk[aboveIdx] = BLOCK.FLOWER_BLUE;
            }
          }
        }
      } else if (surfaceBlock === BLOCK.SAND && biome === 'desert') {
        // Desert gets dead bushes
        if (rand < 0.02) {
          chunk[aboveIdx] = BLOCK.DEAD_BUSH;
        }
      }
    }
  }

  return chunk;
}

// ==================== MESH GEOMETRY BUILDING ====================
function addCrossGeometry(wx, y, wz, color, target) {
  const r = ((color >> 16) & 255) / 255;
  const g = ((color >> 8) & 255) / 255;
  const b = (color & 255) / 255;

  // Offset to center the X in the block
  const offset = 0.15;
  const height = 0.9;  // Slightly shorter than full block

  // Two diagonal planes forming an X shape
  // Each plane needs front and back faces (6 vertices each = 2 triangles)
  
  // Plane 1: Goes from (0,0,0) to (1,0,1) corner
  const plane1 = [
    // Front face
    { pos: [offset, 0, offset], norm: [-0.707, 0, 0.707] },
    { pos: [1 - offset, 0, 1 - offset], norm: [-0.707, 0, 0.707] },
    { pos: [1 - offset, height, 1 - offset], norm: [-0.707, 0, 0.707] },
    { pos: [offset, 0, offset], norm: [-0.707, 0, 0.707] },
    { pos: [1 - offset, height, 1 - offset], norm: [-0.707, 0, 0.707] },
    { pos: [offset, height, offset], norm: [-0.707, 0, 0.707] },
    // Back face
    { pos: [1 - offset, 0, 1 - offset], norm: [0.707, 0, -0.707] },
    { pos: [offset, 0, offset], norm: [0.707, 0, -0.707] },
    { pos: [offset, height, offset], norm: [0.707, 0, -0.707] },
    { pos: [1 - offset, 0, 1 - offset], norm: [0.707, 0, -0.707] },
    { pos: [offset, height, offset], norm: [0.707, 0, -0.707] },
    { pos: [1 - offset, height, 1 - offset], norm: [0.707, 0, -0.707] }
  ];

  // Plane 2: Goes from (1,0,0) to (0,0,1) corner
  const plane2 = [
    // Front face
    { pos: [1 - offset, 0, offset], norm: [0.707, 0, 0.707] },
    { pos: [offset, 0, 1 - offset], norm: [0.707, 0, 0.707] },
    { pos: [offset, height, 1 - offset], norm: [0.707, 0, 0.707] },
    { pos: [1 - offset, 0, offset], norm: [0.707, 0, 0.707] },
    { pos: [offset, height, 1 - offset], norm: [0.707, 0, 0.707] },
    { pos: [1 - offset, height, offset], norm: [0.707, 0, 0.707] },
    // Back face
    { pos: [offset, 0, 1 - offset], norm: [-0.707, 0, -0.707] },
    { pos: [1 - offset, 0, offset], norm: [-0.707, 0, -0.707] },
    { pos: [1 - offset, height, offset], norm: [-0.707, 0, -0.707] },
    { pos: [offset, 0, 1 - offset], norm: [-0.707, 0, -0.707] },
    { pos: [1 - offset, height, offset], norm: [-0.707, 0, -0.707] },
    { pos: [offset, height, 1 - offset], norm: [-0.707, 0, -0.707] }
  ];

  // Add slight random rotation/offset per block for variety
  const variation = (Math.sin(wx * 12.9898 + wz * 78.233) * 43758.5453) % 1;
  const colorMult = 0.85 + Math.abs(variation) * 0.15;

  const allVerts = [...plane1, ...plane2];
  
  for (const vert of allVerts) {
    target.pos.push(wx + vert.pos[0], y + vert.pos[1], wz + vert.pos[2]);
    target.col.push(r * colorMult, g * colorMult, b * colorMult);
    target.norm.push(vert.norm[0], vert.norm[1], vert.norm[2]);
  }
}

function buildMeshGeometry(cx, cz, chunk, neighbors, modifiedBlocks) {
  // Add uvs array to both opaque and transparent
  const opaque = { pos: [], col: [], norm: [], uvs: [] };
  const trans = { pos: [], col: [], norm: [], uvs: [] };

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

  const FACE_NORMALS = {
    top:    [0, 1, 0],
    bottom: [0, -1, 0],
    front:  [0, 0, 1],
    back:   [0, 0, -1],
    right:  [1, 0, 0],
    left:   [-1, 0, 0]
  };

  // UV corners for each face direction
  // Order matches FACE_DATA corner order: [0,1,2,3]
  const FACE_UVS = {
    top:    [[0, 0], [0, 1], [1, 1], [1, 0]],
    bottom: [[0, 1], [0, 0], [1, 0], [1, 1]],
    front:  [[0, 0], [1, 0], [1, 1], [0, 1]],
    back:   [[1, 0], [0, 0], [0, 1], [1, 1]],
    right:  [[0, 0], [0, 1], [1, 1], [1, 0]],
    left:   [[1, 0], [1, 1], [0, 1], [0, 0]]
  };

  const addFace = (wx, y, wz, dir, texSlot, target) => {
    // Get texture UV coordinates
    const [texCol, texRow] = texSlot || TEX.MISSING;
    const texU = texCol * TILE_SIZE;
    const texV = texRow * TILE_SIZE;

    const face = FACE_DATA[dir];
    const normal = FACE_NORMALS[dir];
    const faceUVs = FACE_UVS[dir];

    // Calculate AO for each corner
    const ao = face.corners.map(c => {
      const n = c.neighbors;
      const s1 = isOccluder(wx + n[0][0], y + n[0][1], wz + n[0][2]) ? 1 : 0;
      const s2 = isOccluder(wx + n[1][0], y + n[1][1], wz + n[1][2]) ? 1 : 0;
      const corner = isOccluder(wx + n[2][0], y + n[2][1], wz + n[2][2]) ? 1 : 0;
      return vertexAO(s1, s2, corner);
    });

    // Flip quad for better AO
    const flip = ao[0] + ao[2] < ao[1] + ao[3];
    const indices = flip ? [1, 2, 3, 1, 3, 0] : [0, 1, 2, 0, 2, 3];

    // Slight color variation
    const noise = (Math.sin(wx * 12.9898 + wz * 78.233) * 43758.5453) % 1;
    const v = 1 - (Math.abs(noise) * 0.05);

    indices.forEach(i => {
      const corner = face.corners[i];
      
      // Position
      target.pos.push(wx + corner.pos[0], y + corner.pos[1], wz + corner.pos[2]);
      
      // Color (AO tint - will be multiplied with texture)
      const aoMult = aoLevels[ao[i]] * face.shade * v;
      target.col.push(aoMult, aoMult, aoMult);  // Grayscale for AO
      
      // Normal
      target.norm.push(normal[0], normal[1], normal[2]);
      
      // UV coordinates
      const uv = faceUVs[i];
      target.uvs.push(
        texU + uv[0] * TILE_SIZE,
        texV + uv[1] * TILE_SIZE
      );
    });
  };

  // Cross geometry with UVs
  const addCrossGeometry = (wx, y, wz, texSlot, target) => {
    const [texCol, texRow] = texSlot || TEX.MISSING;
    const texU = texCol * TILE_SIZE;
    const texV = texRow * TILE_SIZE;

    const offset = 0.15;
    const height = 0.9;

    // Color variation
    const variation = (Math.sin(wx * 12.9898 + wz * 78.233) * 43758.5453) % 1;
    const colorMult = 0.85 + Math.abs(variation) * 0.15;

    // Plane 1 vertices with UVs
    const plane1 = [
      // Front face (2 triangles)
      { pos: [offset, 0, offset], uv: [0, 0] },
      { pos: [1 - offset, 0, 1 - offset], uv: [1, 0] },
      { pos: [1 - offset, height, 1 - offset], uv: [1, 1] },
      { pos: [offset, 0, offset], uv: [0, 0] },
      { pos: [1 - offset, height, 1 - offset], uv: [1, 1] },
      { pos: [offset, height, offset], uv: [0, 1] },
      // Back face
      { pos: [1 - offset, 0, 1 - offset], uv: [1, 0] },
      { pos: [offset, 0, offset], uv: [0, 0] },
      { pos: [offset, height, offset], uv: [0, 1] },
      { pos: [1 - offset, 0, 1 - offset], uv: [1, 0] },
      { pos: [offset, height, offset], uv: [0, 1] },
      { pos: [1 - offset, height, 1 - offset], uv: [1, 1] }
    ];

    // Plane 2 vertices with UVs
    const plane2 = [
      // Front face
      { pos: [1 - offset, 0, offset], uv: [0, 0] },
      { pos: [offset, 0, 1 - offset], uv: [1, 0] },
      { pos: [offset, height, 1 - offset], uv: [1, 1] },
      { pos: [1 - offset, 0, offset], uv: [0, 0] },
      { pos: [offset, height, 1 - offset], uv: [1, 1] },
      { pos: [1 - offset, height, offset], uv: [0, 1] },
      // Back face
      { pos: [offset, 0, 1 - offset], uv: [1, 0] },
      { pos: [1 - offset, 0, offset], uv: [0, 0] },
      { pos: [1 - offset, height, offset], uv: [0, 1] },
      { pos: [offset, 0, 1 - offset], uv: [1, 0] },
      { pos: [1 - offset, height, offset], uv: [0, 1] },
      { pos: [offset, height, 1 - offset], uv: [1, 1] }
    ];

    const allVerts = [...plane1, ...plane2];

    for (const vert of allVerts) {
      target.pos.push(wx + vert.pos[0], y + vert.pos[1], wz + vert.pos[2]);
      target.col.push(colorMult, colorMult, colorMult);
      target.norm.push(0, 1, 0);  // Simplified normal
      target.uvs.push(
        texU + vert.uv[0] * TILE_SIZE,
        texV + vert.uv[1] * TILE_SIZE
      );
    }
  };

  // Main loop
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
        const tex = data.tex || {};  // Texture slots

        // Handle cross-type blocks
        if (data.type === BLOCK_TYPE.CROSS) {
          addCrossGeometry(wx, y, wz, tex.side, trans);
          continue;
        }

        // Standard cube faces
        const shouldRender = (nx, ny, nz) => {
          const neighbor = getBlock(nx, ny, nz);
          if (neighbor === BLOCK.AIR) return true;
          const nData = BLOCK_DATA[neighbor];
          if (!nData) return true;
          if (nData.transparent && !data.transparent) return true;
          if (data.transparent && nData.transparent && neighbor !== block) return true;
          return false;
        };

        if (shouldRender(wx, y + 1, wz)) addFace(wx, y, wz, 'top', tex.top, target);
        if (shouldRender(wx, y - 1, wz)) addFace(wx, y, wz, 'bottom', tex.bottom, target);
        if (shouldRender(wx, y, wz + 1)) addFace(wx, y, wz, 'front', tex.side, target);
        if (shouldRender(wx, y, wz - 1)) addFace(wx, y, wz, 'back', tex.side, target);
        if (shouldRender(wx + 1, y, wz)) addFace(wx, y, wz, 'right', tex.side, target);
        if (shouldRender(wx - 1, y, wz)) addFace(wx, y, wz, 'left', tex.side, target);
      }
    }
  }

  return {
    opaque: {
      positions: new Float32Array(opaque.pos),
      colors: new Float32Array(opaque.col),
      normals: new Float32Array(opaque.norm),
      uvs: new Float32Array(opaque.uvs)
    },
    transparent: {
      positions: new Float32Array(trans.pos),
      colors: new Float32Array(trans.col),
      normals: new Float32Array(trans.norm),
      uvs: new Float32Array(trans.uvs)
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
    
    const transferList = [
      chunkData.buffer,
      geometry.opaque.positions.buffer,
      geometry.opaque.colors.buffer,
      geometry.opaque.normals.buffer,
      geometry.opaque.uvs.buffer,
      geometry.transparent.positions.buffer,
      geometry.transparent.colors.buffer,
      geometry.transparent.normals.buffer,
      geometry.transparent.uvs.buffer
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
    
    const transferList = [
      geometry.opaque.positions.buffer,
      geometry.opaque.colors.buffer,
      geometry.opaque.normals.buffer,
      geometry.opaque.uvs.buffer,
      geometry.transparent.positions.buffer,
      geometry.transparent.colors.buffer,
      geometry.transparent.normals.buffer,
      geometry.transparent.uvs.buffer
    ];
    
    self.postMessage({
      type: 'mesh',
      id, cx, cz,
      geometry
    }, transferList);
  }
};
