// Add this to the very top of chunkWorker.js
self.onerror = function(message, source, lineno, colno, error) {
  console.log("Worker internal error:", message, "at", lineno, ":", colno);
};
console.log("Worker script loaded successfully");
import SimplexNoise from "../noise/SimplexNoise.js";
import {
  CHUNK_SIZE,
  WORLD_HEIGHT,
  WATER_LEVEL,
  BLOCK,
  BLOCK_DATA,
  FACE_DATA,
} from "../constants.js";

const fract = (n) => n - Math.floor(n);

// Deterministic “random” from coordinates (fast, no PRNG state)
function rand2(x, z, seed) {
  return fract(Math.sin(x * 127.1 + z * 311.7 + seed * 0.013) * 43758.5453123);
}
function rand3(x, y, z, seed) {
  return fract(Math.sin(x * 127.1 + y * 269.5 + z * 311.7 + seed * 0.017) * 43758.5453123);
}

function idx(lx, y, lz) {
  return lx + y * CHUNK_SIZE + lz * CHUNK_SIZE * WORLD_HEIGHT;
}

function makeWorldGen(worldSeed) {
  // Keep the same noise seeds as your original (42 & 123), but you can incorporate worldSeed if you want
  const noise = new SimplexNoise(42 + worldSeed * 0.001);
  const noiseDetail = new SimplexNoise(123 + worldSeed * 0.001);

  function getTerrainHeight(x, z) {
    const scale = 0.008;
    const detailScale = 0.03;

    let base = noise.octave(x * scale, z * scale, 4, 0.5);
    let detail = noiseDetail.octave(x * detailScale, z * detailScale, 2, 0.5);

    let height = 20 + base * 25 + detail * 5;

    let mountain = noise.octave(x * 0.004, z * 0.004, 3, 0.4);
    if (mountain > 0.3) height += (mountain - 0.3) * 60;

    return Math.floor(height);
  }

  function getBiome(x, z) {
    const temp = noise.noise2D(x * 0.002, z * 0.002);
    const moisture = noiseDetail.noise2D(x * 0.003, z * 0.003);

    if (temp > 0.4) return "desert";
    if (temp < -0.4) return "snow";
    if (moisture > 0.3) return "forest";
    return "plains";
  }

  return { getTerrainHeight, getBiome };
}

function generateChunkVoxels({ cx, cz, worldSeed, mods }) {
  const { getTerrainHeight, getBiome } = makeWorldGen(worldSeed);

  const chunk = new Uint8Array(CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE);
  let yMax = 1;

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wx = cx * CHUNK_SIZE + lx;
      const wz = cz * CHUNK_SIZE + lz;

      const height = getTerrainHeight(wx, wz);
      const biome = getBiome(wx, wz);

      // Always bedrock at y=0
      chunk[idx(lx, 0, lz)] = BLOCK.BEDROCK;

      // Fill only up to height (everything above stays AIR because Uint8Array defaults to 0)
      for (let y = 1; y <= Math.min(height, WORLD_HEIGHT - 1); y++) {
        if (y < height - 4) {
          const r = rand3(wx, y, wz, worldSeed);
          if (r < 0.008) chunk[idx(lx, y, lz)] = BLOCK.COAL_ORE;
          else if (r < 0.012 && y < 40) chunk[idx(lx, y, lz)] = BLOCK.IRON_ORE;
          else if (r < 0.014 && y < 20) chunk[idx(lx, y, lz)] = BLOCK.GOLD_ORE;
          else if (r < 0.016 && y < 16) chunk[idx(lx, y, lz)] = BLOCK.DIAMOND_ORE;
          else chunk[idx(lx, y, lz)] = BLOCK.STONE;
        } else if (y < height - 1) {
          chunk[idx(lx, y, lz)] = biome === "desert" ? BLOCK.SAND : BLOCK.DIRT;
        } else {
          if (biome === "desert") chunk[idx(lx, y, lz)] = BLOCK.SAND;
          else if (biome === "snow") chunk[idx(lx, y, lz)] = BLOCK.SNOW;
          else if (height <= WATER_LEVEL + 2) chunk[idx(lx, y, lz)] = BLOCK.SAND;
          else chunk[idx(lx, y, lz)] = BLOCK.GRASS;
        }
      }

      // Water (your WATER_LEVEL is 0, but keep logic in case you change it later)
      if (WATER_LEVEL > 0) {
        for (let y = 1; y <= Math.min(WATER_LEVEL, WORLD_HEIGHT - 1); y++) {
          if (y > height) chunk[idx(lx, y, lz)] = BLOCK.WATER;
        }
      }

      // Trees (deterministic)
      if (height > WATER_LEVEL + 2 && biome !== "desert" && rand2(wx, wz, worldSeed + 999) < 0.015) {
        const treeHeight = 4 + Math.floor(rand2(wx, wz, worldSeed + 12345) * 2);

        for (let ty = 0; ty < treeHeight; ty++) {
          const y = height + ty;
          if (y < WORLD_HEIGHT) chunk[idx(lx, y, lz)] = BLOCK.WOOD;
        }

        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            for (let dy = treeHeight - 1; dy <= treeHeight + 1; dy++) {
              // corner skip (deterministic)
              if (Math.abs(dx) === 2 && Math.abs(dz) === 2) {
                const rr = rand3(wx + dx, height + dy, wz + dz, worldSeed + 777);
                if (rr < 0.5) continue;
              }

              const nx = lx + dx,
                nz = lz + dz,
                ny = height + dy;

              if (nx >= 0 && nx < CHUNK_SIZE && nz >= 0 && nz < CHUNK_SIZE && ny < WORLD_HEIGHT && ny >= 0) {
                if (chunk[idx(nx, ny, nz)] === BLOCK.AIR) chunk[idx(nx, ny, nz)] = BLOCK.LEAVES;
              }
            }
          }
        }

        yMax = Math.max(yMax, height + treeHeight + 2);
      } else {
        yMax = Math.max(yMax, height + 2);
      }
    }
  }

  // Apply modifications for persistence (mods are local coords)
  if (mods && mods.length) {
    for (const [lx, y, lz, type] of mods) {
      if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE || y < 0 || y >= WORLD_HEIGHT) continue;
      chunk[idx(lx, y, lz)] = type;
      yMax = Math.max(yMax, y + 2);
    }
  }

  yMax = Math.min(WORLD_HEIGHT - 1, yMax);
  return { chunk, yMax };
}

function buildChunkMesh({ cx, cz, chunk, yMax }) {
  const opaquePos = [];
  const opaqueCol = [];
  const transPos = [];
  const transCol = [];

  const localGetBlock = (x, y, z) => {
    if (y < 0 || y >= WORLD_HEIGHT) return BLOCK.AIR;
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;
    if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) return BLOCK.AIR;
    return chunk[idx(lx, y, lz)];
  };

  const isOccluder = (x, y, z) => {
    const b = localGetBlock(x, y, z);
    return b !== BLOCK.AIR && !BLOCK_DATA[b]?.transparent;
  };

  const vertexAO = (s1, s2, c) => (s1 && s2) ? 0 : 3 - (s1 + s2 + c);
  const aoLevels = [0.5, 0.7, 0.85, 1.0];

  const addFace = (x, y, z, dir, color, targetPos, targetCol) => {
    const r = ((color >> 16) & 255) / 255;
    const g = ((color >> 8) & 255) / 255;
    const b = (color & 255) / 255;

    const face = FACE_DATA[dir];

    const ao = face.corners.map((c) => {
      const s1 = isOccluder(x + c.neighbors[0][0], y + c.neighbors[0][1], z + c.neighbors[0][2]) ? 1 : 0;
      const s2 = isOccluder(x + c.neighbors[1][0], y + c.neighbors[1][1], z + c.neighbors[1][2]) ? 1 : 0;
      const cc = isOccluder(x + c.neighbors[2][0], y + c.neighbors[2][1], z + c.neighbors[2][2]) ? 1 : 0;
      return vertexAO(s1, s2, cc);
    });

    const flip = ao[0] + ao[2] < ao[1] + ao[3];
    const indices = flip ? [1, 2, 3, 1, 3, 0] : [0, 1, 2, 0, 2, 3];

    const n = fract(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453);
    const v = 1 - Math.abs(n) * 0.08;

    for (const i of indices) {
      const corner = face.corners[i];
      targetPos.push(x + corner.pos[0], y + corner.pos[1], z + corner.pos[2]);
      const m = aoLevels[ao[i]] * face.shade * v;
      targetCol.push(r * m, g * m, b * m);
    }
  };

  const shouldRender = (data, nx, ny, nz, block) => {
    const neighbor = localGetBlock(nx, ny, nz);
    if (neighbor === BLOCK.AIR) return true;
    const nData = BLOCK_DATA[neighbor];
    if (!nData) return true;
    if (nData.transparent && !data.transparent) return true;
    if (data.transparent && nData.transparent && neighbor !== block) return true;
    return false;
  };

  const yLimit = Math.min(WORLD_HEIGHT - 1, Math.max(2, yMax));

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let y = 0; y <= yLimit; y++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;

        const block = chunk[idx(lx, y, lz)];
        if (block === BLOCK.AIR) continue;

        const data = BLOCK_DATA[block];
        if (!data) continue;

        const isTrans = !!data.transparent;
        const tp = isTrans ? transPos : opaquePos;
        const tc = isTrans ? transCol : opaqueCol;

        if (shouldRender(data, wx, y + 1, wz, block)) addFace(wx, y, wz, "top", data.top, tp, tc);
        if (shouldRender(data, wx, y - 1, wz, block)) addFace(wx, y, wz, "bottom", data.bottom, tp, tc);
        if (shouldRender(data, wx, y, wz + 1, block)) addFace(wx, y, wz, "front", data.side, tp, tc);
        if (shouldRender(data, wx, y, wz - 1, block)) addFace(wx, y, wz, "back", data.side, tp, tc);
        if (shouldRender(data, wx + 1, y, wz, block)) addFace(wx, y, wz, "right", data.side, tp, tc);
        if (shouldRender(data, wx - 1, y, wz, block)) addFace(wx, y, wz, "left", data.side, tp, tc);
      }
    }
  }

  // Convert to typed arrays for fast transfer
  return {
    opaquePos: new Float32Array(opaquePos),
    opaqueCol: new Float32Array(opaqueCol),
    transPos: new Float32Array(transPos),
    transCol: new Float32Array(transCol),
  };
}

self.onmessage = (e) => {
  const msg = e.data;

  try {
    if (msg.type === "generate") {
      const { chunk, yMax } = generateChunkVoxels(msg);
      const mesh = buildChunkMesh({ cx: msg.cx, cz: msg.cz, chunk, yMax });

      self.postMessage(
        {
          ok: true,
          id: msg.id,
          type: "generated",
          cx: msg.cx,
          cz: msg.cz,
          yMax,
          chunkBuffer: chunk.buffer,
          mesh: {
            opaquePos: mesh.opaquePos.buffer,
            opaqueCol: mesh.opaqueCol.buffer,
            transPos: mesh.transPos.buffer,
            transCol: mesh.transCol.buffer,
          },
        },
        [
          chunk.buffer,
          mesh.opaquePos.buffer,
          mesh.opaqueCol.buffer,
          mesh.transPos.buffer,
          mesh.transCol.buffer,
        ]
      );
      return;
    }

    if (msg.type === "mesh") {
      const chunk = new Uint8Array(msg.chunkCopyBuffer);
      const mesh = buildChunkMesh({ cx: msg.cx, cz: msg.cz, chunk, yMax: msg.yMax });

      self.postMessage(
        {
          ok: true,
          id: msg.id,
          type: "meshed",
          cx: msg.cx,
          cz: msg.cz,
          mesh: {
            opaquePos: mesh.opaquePos.buffer,
            opaqueCol: mesh.opaqueCol.buffer,
            transPos: mesh.transPos.buffer,
            transCol: mesh.transCol.buffer,
          },
        },
        [mesh.opaquePos.buffer, mesh.opaqueCol.buffer, mesh.transPos.buffer, mesh.transCol.buffer]
      );
      return;
    }

    throw new Error(`Unknown worker msg type: ${msg.type}`);
  } catch (err) {
    self.postMessage({
      ok: false,
      id: msg.id,
      error: err?.message || String(err),
    });
  }
};
