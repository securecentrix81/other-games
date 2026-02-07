// ==================== GAME CLASS ====================
class MinecraftGame {
  constructor() {
    this.saveManager = new SaveManager();
    this.currentSlot = null;
    this.worldSeed = 42;
    this.worldName = 'World';
    
    this.settings = {
      renderDistance: 6,
      shadowsEnabled: false,
      shadowDistance: 50,
      shadowResolution: 4096,
      fov: 80,
      sensitivity: 1.0,
      fullscreen: false,
      autosave: true
    };
    
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, window.innerWidth / window.innerHeight, 0.01, 500);
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x87ceeb);
    document.getElementById('game-container').prepend(this.renderer.domElement);

    this.noise = null;
    this.noiseDetail = null;
    this.chunks = new Map();
    this.chunkMeshes = new Map();
    this.modifiedBlocks = new Map();
    this.pendingChunks = new Map();
    
    // NEW: Mesh building queue for smooth loading
    this.meshBuildQueue = [];
    this.pendingMeshes = new Map();

    // Web Worker for chunk generation
    this.chunkWorker = null;
    this.chunkRequestId = 0;
    this.initChunkWorker();

    this.player = {
      position: new THREE.Vector3(8, 50, 8),
      velocity: new THREE.Vector3(),
      onGround: false,
      yaw: 0,
      pitch: 0,
      inWater: false,
      health: MAX_HEALTH,
      fallStartY: null,
      isDead: false
    };

    this.keys = {};
    this.selectedSlot = 0;
    this.hotbarSlots = new Array(9).fill(null);
    this.inventorySlots = new Array(27).fill(null);
    this.inventoryOpen = false;

    this.isPlaying = false;
    this.isPaused = false;
    this.lastTime = 0;
    this.frameCount = 0;
    this.fpsTime = 0;
    this.fps = 0;

    this.targetBlock = null;
    this.placementBlock = null;
    this.breakProgress = 0;
    this.breaking = false;
    this.currentBreakingBlock = null;
    
    this.placing = false;
    this.placeCooldown = 0;

    this.particleSystem = [];
    
    this.gameMode = 'survival';
    this.isFlying = false;
    this.lastSpacePress = 0;

    this.autosaveTimer = null;
    this.lastAutosave = 0;
    
    this.droppedItems = [];
    this.heldInventoryItem = null;  // For inventory drag/drop
    
    this.mouse = {x:0,y:0}

    this.textureAtlas = null;
    this.textureLoaded = false;
    this.loadTextureAtlas();

    this.breakCooldown = 0; 

    this.init();
  }

  // ==================== WEB WORKER SETUP ====================
  
  initChunkWorker() {
    try {
      this.chunkWorker = new Worker('js/workers/chunk-worker.js');
      
      this.chunkWorker.onmessage = (e) => {
        const { type, id, cx, cz, data, chunkData, geometry } = e.data;
        const key = `${cx},${cz}`;
        
        if (type === 'chunk') {
          // Chunk data only - queue mesh build
          const chunk = new Uint8Array(data);
          this.chunks.set(key, chunk);
          this.applyModificationsToChunk(cx, cz);
          this.pendingChunks.delete(key);
          
          // Queue mesh building
          this.queueMeshBuild(cx, cz);
        }
        else if (type === 'chunkWithMesh') {
          // Chunk data + mesh geometry together
          const chunk = new Uint8Array(chunkData);
          this.chunks.set(key, chunk);
          this.applyModificationsToChunk(cx, cz);
          this.pendingChunks.delete(key);
          this.pendingMeshes.delete(key);
          
          // Create mesh from geometry (fast - just creating THREE objects)
          this.createMeshFromGeometry(cx, cz, geometry);
        }
        else if (type === 'mesh') {
          // Mesh geometry only (for rebuild requests)
          this.pendingMeshes.delete(key);
          this.createMeshFromGeometry(cx, cz, geometry);
        }
        else if (type === 'ready') {
          console.log('Chunk worker ready');
        }
      };
      
      this.chunkWorker.onerror = (e) => {
        console.error('Chunk worker error:', e);
        this.chunkWorker = null;
      };
    } catch (e) {
      alert(e.message)
      console.warn('Web Workers not supported, using main thread for chunk generation');
      this.chunkWorker = null;
    }
  }

  init() {
    this.loadSettings(); // Moved up: Must load data before building UI
    this.setupLighting();
    this.setupHighlight();
    this.setupHotbar();
    this.setupHealthBar();
    this.setupEventListeners();
    this.setupSettingsUI(); 
    this.setupInventoryUI();
    this.setupSaveUI();
    this.updateWorldSlots();
  }

  // ==================== SAVE/LOAD SYSTEM ====================
  
  /* Put setupSaveUI method here - handles new world button, create/cancel, export/import */
  setupSaveUI() {
    document.getElementById('new-world-btn').onclick = () => {
      document.getElementById('new-world-form').classList.add('visible');
    };

    document.getElementById('cancel-new-world-btn').onclick = () => {
      document.getElementById('new-world-form').classList.remove('visible');
    };

    document.getElementById('create-world-btn').onclick = () => {
      const name = document.getElementById('world-name').value.trim() || 'My World';
      const seedInput = document.getElementById('world-seed').value.trim();
      const seed = seedInput ? this.hashString(seedInput) : Math.floor(Math.random() * 1000000);
      
      const saves = this.saveManager.getAllSaves();
      let slotId = null;
      for (let i = 1; i <= MAX_SAVE_SLOTS; i++) {
        if (!saves[`slot${i}`]) {
          slotId = `slot${i}`;
          break;
        }
      }
      
      if (!slotId) {
        alert('All save slots are full! Delete a world first.');
        return;
      }
      
      this.currentSlot = slotId;
      this.worldName = name;
      this.worldSeed = seed;
      
      document.getElementById('new-world-form').classList.remove('visible');
      document.getElementById('world-name').value = '';
      document.getElementById('world-seed').value = '';
      
      this.startGame(true);
    };

    document.getElementById('export-btn').onclick = () => {
      if (!this.currentSlot) {
        alert('Select a world first!');
        return;
      }
      this.exportWorld();
    };

    document.getElementById('import-btn').onclick = () => {
      document.getElementById('file-import').click();
    };

    document.getElementById('file-import').onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        this.importWorld(file);
      }
      e.target.value = '';
    };
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /* Put updateWorldSlots method here - updates the world selection UI */
  updateWorldSlots() {
    const container = document.getElementById('world-slots');
    container.innerHTML = '';
    
    const saves = this.saveManager.getAllSaves();
    
    for (let i = 1; i <= MAX_SAVE_SLOTS; i++) {
      const slotId = `slot${i}`;
      const save = saves[slotId];
      
      const slot = document.createElement('div');
      slot.className = 'world-slot' + (save ? '' : ' empty') + 
                     (this.currentSlot === slotId ? ' selected' : '');
      
      if (save) {
        const date = new Date(save.savedAt);
        const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        const blocksChanged = save.modifiedBlocks ? save.modifiedBlocks.length : 0;
        
        slot.innerHTML = `
          <h3>📁 ${save.worldName || 'World ' + i}</h3>
          <p>Seed: ${save.seed}</p>
          <p>Last played: ${timeStr}</p>
          <p>Blocks modified: ${blocksChanged}</p>
          <button class="delete-btn" data-slot="${slotId}">🗑️ Delete</button>
        `;
        
        slot.onclick = (e) => {
          if (e.target.classList.contains('delete-btn')) return;
          this.currentSlot = slotId;
          this.updateWorldSlots();
        };
        
        slot.querySelector('.delete-btn').onclick = (e) => {
          e.stopPropagation();
          if (confirm(`Delete "${save.worldName}"? This cannot be undone!`)) {
            this.saveManager.deleteSave(slotId);
            if (this.currentSlot === slotId) {
              this.currentSlot = null;
            }
            this.updateWorldSlots();
          }
        };
      } else {
        slot.innerHTML = `
          <h3>Empty Slot ${i}</h3>
          <p>Click "New World" to create</p>
        `;
        slot.onclick = () => {
          this.currentSlot = slotId;
          this.updateWorldSlots();
          document.getElementById('new-world-form').classList.add('visible');
        };
      }
      
      container.appendChild(slot);
    }
    
    const startBtn = document.getElementById('start-btn');
    const exportBtn = document.getElementById('export-btn');
    
    if (this.currentSlot && saves[this.currentSlot]) {
      startBtn.disabled = false;
      startBtn.textContent = 'Play Selected World';
      exportBtn.disabled = false;
    } else {
      startBtn.disabled = true;
      startBtn.textContent = 'Select a World';
      exportBtn.disabled = true;
    }
  }

  /* Put createSaveData method here */
  createSaveData() {
    return {
      version: SAVE_VERSION,
      worldName: this.worldName,
      seed: this.worldSeed,
      player: {
        position: {
          x: this.player.position.x,
          y: this.player.position.y,
          z: this.player.position.z
        },
        yaw: this.player.yaw,
        pitch: this.player.pitch,
        health: this.player.health,
        gameMode: this.gameMode,
        isFlying: this.isFlying
      },
      hotbar: this.hotbarSlots.map(slot => slot ? {...slot} : null),
      inventory: this.inventorySlots.map(slot => slot ? {...slot} : null),
      selectedSlot: this.selectedSlot,
      modifiedBlocks: Array.from(this.modifiedBlocks.entries()),
      // In createSaveData(), change droppedItems to use item.position:
      droppedItems: this.droppedItems.map(item => ({
        x: item.position.x,
        y: item.position.y,
        z: item.position.z,
        itemId: item.itemId,
        count: item.count,
        vx: item.velocity.x,
        vy: item.velocity.y,
        vz: item.velocity.z
      }))
    };
  }

  /* Put saveGame, loadGame, showAutosaveIndicator, startAutosave, stopAutosave, 
     exportWorld, importWorld, loadSettings, saveSettings methods here */
  
  saveGame(showIndicator = true) {
    if (!this.currentSlot || !this.isPlaying) return false;
    
    const saveData = this.createSaveData();
    const success = this.saveManager.saveGame(this.currentSlot, saveData);
    
    if (success && showIndicator) {
      this.showAutosaveIndicator();
    }
    
    return success;
  }

  loadGame(slotId) {
    const save = this.saveManager.getSave(slotId);
    if (!save) return false;
    
    this.worldName = save.worldName || 'World';
    this.worldSeed = save.seed;
    
    if (save.player) {
      this.player.position.set(
        save.player.position.x,
        save.player.position.y+0.1,
        save.player.position.z
      );
      this.player.yaw = save.player.yaw || 0;
      this.player.pitch = save.player.pitch || 0;
      this.player.health = save.player.health || MAX_HEALTH;
      this.gameMode = save.player.gameMode || 'survival';
      this.isFlying = save.player.isFlying || false;
    }
    
    this.hotbarSlots = save.hotbar ? save.hotbar.map(s => s ? {...s} : null) : new Array(9).fill(null);
    this.inventorySlots = save.inventory ? save.inventory.map(s => s ? {...s} : null) : new Array(27).fill(null);
    this.selectedSlot = save.selectedSlot || 0;
    
    this.modifiedBlocks.clear();
    if (save.modifiedBlocks) {
      for (const [key, value] of save.modifiedBlocks) {
        this.modifiedBlocks.set(key, value);
      }
    }
    if (save.droppedItems) {
      for (const di of save.droppedItems) {
        const vel = new THREE.Vector3(di.vx || 0, di.vy || 0, di.vz || 0);
        this.spawnDroppedItem(di.x, di.y, di.z, di.itemId, di.count, vel);
      }
    }
    
    return true;
  }

  showAutosaveIndicator() {
    const indicator = document.getElementById('autosave-indicator');
    indicator.classList.add('visible');
    setTimeout(() => {
      indicator.classList.remove('visible');
    }, 2000);
  }

  startAutosave() {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
    }
    
    if (this.settings.autosave) {
      this.autosaveTimer = setInterval(() => {
        if (this.isPlaying && !this.isPaused && !this.player.isDead) {
          this.saveGame(true);
        }
      }, AUTOSAVE_INTERVAL);
    }
  }

  stopAutosave() {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  exportWorld() {
    if (!this.currentSlot) return;
    
    if (this.isPlaying) {
      this.saveGame(false);
    }
    
    const saveData = this.saveManager.getSave(this.currentSlot);
    if (!saveData) return;
    
    const json = JSON.stringify(saveData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${saveData.worldName || 'world'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importWorld(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const saveData = JSON.parse(e.target.result);
        
        if (!saveData.version || !saveData.seed) {
          throw new Error('Invalid save file');
        }
        
        const saves = this.saveManager.getAllSaves();
        let slotId = null;
        for (let i = 1; i <= MAX_SAVE_SLOTS; i++) {
          if (!saves[`slot${i}`]) {
            slotId = `slot${i}`;
            break;
          }
        }
        
        if (!slotId) {
          alert('All save slots are full! Delete a world first.');
          return;
        }
        
        saveData.worldName = saveData.worldName || file.name.replace('.json', '');
        this.saveManager.saveGame(slotId, saveData);
        this.currentSlot = slotId;
        this.updateWorldSlots();
        
        alert(`World "${saveData.worldName}" imported successfully!`);
      } catch (err) {
        console.error('Import failed:', err);
        alert('Failed to import world. Invalid file format.');
      }
    };
    
    reader.readAsText(file);
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('minecraft_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        Object.assign(this.settings, settings);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('minecraft_settings', JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  // ==================== LIGHTING & SETUP ====================

  /* Put setupLighting method here */
  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);
  
    this.sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
    this.sun.position.set(100, 200, 50);
    
    this.sunTarget = new THREE.Object3D();
    this.scene.add(this.sunTarget);
    this.sun.target = this.sunTarget;
    this.scene.add(this.sun);
  
    this.updateFog();
  }

  updateShadows() {
    if (this.settings.shadowsEnabled) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.VSMShadowMap;
      this.sun.castShadow = true;

      // Use settings for Resolution
      const res = this.settings.shadowResolution || 4096;
      this.sun.shadow.mapSize.set(res, res);
      
      // Use settings for Range (Distance)
      const d = this.settings.shadowDistance || 200;
      
      this.sun.shadow.camera.left = -d;
      this.sun.shadow.camera.right = d;
      this.sun.shadow.camera.top = d;
      this.sun.shadow.camera.bottom = -d;
      this.sun.shadow.camera.near = 1;
      this.sun.shadow.camera.far = 350; // You might want to increase this if Range > 300
      this.sun.shadow.blurSamples = 4;
      this.sun.shadow.bias = -0.0002;
      this.sun.shadow.normalBias = 0;
      this.sun.shadow.camera.updateProjectionMatrix();
      
      // Update materials needsUpdate to reflect shadow changes immediately
      this.chunkMeshes.forEach((group) => {
        group.children.forEach(mesh => {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.material.needsUpdate = true;
        });
      });
    } else {
      this.renderer.shadowMap.enabled = false;
      this.sun.castShadow = false;
      
      this.chunkMeshes.forEach((group) => {
        group.children.forEach(mesh => {
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          mesh.material.needsUpdate = true;
        });
      });
    }
  }

  /*updateFog() {
    const viewDistance = CHUNK_SIZE * this.settings.renderDistance;
    // Exponential fog - density controls how quickly it fades
    const density = 0.015 / this.settings.renderDistance;
    this.scene.fog = new THREE.FogExp2(0x87ceeb, density);
  }*/
  updateFog() {
    const viewDistance = CHUNK_SIZE * this.settings.renderDistance;
    this.scene.fog = new THREE.Fog(0x87ceeb, viewDistance * 0.5, viewDistance * 0.9);
  }

  setupHighlight() {
    const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const edges = new THREE.EdgesGeometry(geo);
    this.highlight = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }));
    this.highlight.visible = false;
    this.scene.add(this.highlight);
  }

  /* Put setupHealthBar, updateHealthBar methods here */
  setupHealthBar() {
    const container = document.getElementById('health-bar');
    container.innerHTML = '';
    
    for (let i = 0; i < 10; i++) {
      const heart = document.createElement('div');
      heart.className = 'heart';
      const fill = document.createElement('div');
      fill.className = 'heart-fill';
      fill.id = `heart-${i}`;
      heart.appendChild(fill);
      container.appendChild(heart);
    }
    
    this.updateHealthBar();
  }

  updateHealthBar() {
    const health = this.player.health;
    for (let i = 0; i < 10; i++) {
      const fill = document.getElementById(`heart-${i}`);
      const heartValue = (i + 1) * 2;
      
      if (health >= heartValue) {
        fill.className = 'heart-fill';
      } else if (health >= heartValue - 1) {
        fill.className = 'heart-fill half';
      } else {
        fill.className = 'heart-fill empty';
      }
    }
    
    document.getElementById('health-bar').style.display = 
      this.gameMode === 'creative' ? 'none' : 'flex';
  }

  setupSettingsUI() {
    const panel = document.getElementById('settings-panel');
    
    // Helper to toggle shadow rows visibility
    const updateShadowRows = (enabled) => {
      document.getElementById('shadow-distance-row').style.display = enabled ? 'flex' : 'none';
      document.getElementById('shadow-resolution-row').style.display = enabled ? 'flex' : 'none';
    };

    const rdSlider = document.getElementById('setting-render-distance');
    rdSlider.value = this.settings.renderDistance;
    document.getElementById('render-distance-value').textContent = this.settings.renderDistance;
    rdSlider.oninput = () => {
      this.settings.renderDistance = parseInt(rdSlider.value);
      document.getElementById('render-distance-value').textContent = this.settings.renderDistance;
      this.saveSettings();
    };
    
    const shadowCheck = document.getElementById('setting-shadows');
    shadowCheck.checked = this.settings.shadowsEnabled;
    updateShadowRows(this.settings.shadowsEnabled);
    
    shadowCheck.onchange = () => {
      this.settings.shadowsEnabled = shadowCheck.checked;
      updateShadowRows(shadowCheck.checked);
      if (this.isPlaying) this.updateShadows();
      this.saveSettings();
    };
    
    // Shadow Range (Distance)
    const sdSlider = document.getElementById('setting-shadow-distance');
    sdSlider.value = this.settings.shadowDistance;
    document.getElementById('shadow-distance-value').textContent = this.settings.shadowDistance;
    sdSlider.oninput = () => {
      this.settings.shadowDistance = parseInt(sdSlider.value);
      document.getElementById('shadow-distance-value').textContent = this.settings.shadowDistance;
      if (this.isPlaying && this.settings.shadowsEnabled) this.updateShadows();
      this.saveSettings();
    };

    const resSlider = document.getElementById('setting-shadow-resolution');
    resSlider.value = Math.log2(this.settings.shadowResolution);
    
    document.getElementById('shadow-resolution-value').textContent = this.settings.shadowResolution;
    
    resSlider.oninput = () => {
      this.settings.shadowResolution = 2**parseInt(resSlider.value);
      document.getElementById('shadow-resolution-value').textContent = this.settings.shadowResolution;
      if (this.isPlaying && this.settings.shadowsEnabled) this.updateShadows();
      this.saveSettings();
    };
    
    const fovSlider = document.getElementById('setting-fov');
    fovSlider.value = this.settings.fov;
    document.getElementById('fov-value').textContent = this.settings.fov;
    fovSlider.oninput = () => {
      this.settings.fov = parseInt(fovSlider.value);
      document.getElementById('fov-value').textContent = this.settings.fov;
      this.camera.fov = this.settings.fov;
      this.camera.updateProjectionMatrix();
      this.saveSettings();
    };
    
    const sensSlider = document.getElementById('setting-sensitivity');
    sensSlider.value = this.settings.sensitivity;
    document.getElementById('sensitivity-value').textContent = this.settings.sensitivity.toFixed(1);
    sensSlider.oninput = () => {
      this.settings.sensitivity = parseFloat(sensSlider.value);
      document.getElementById('sensitivity-value').textContent = this.settings.sensitivity.toFixed(1);
      this.saveSettings();
    };
    
    const autosaveCheck = document.getElementById('setting-autosave');
    autosaveCheck.checked = this.settings.autosave;
    autosaveCheck.onchange = () => {
      this.settings.autosave = autosaveCheck.checked;
      if (this.isPlaying) {
        if (this.settings.autosave) {
          this.startAutosave();
        } else {
          this.stopAutosave();
        }
      }
      this.saveSettings();
    };
    
    const fsCheck = document.getElementById('setting-fullscreen');
    fsCheck.checked = this.settings.fullscreen;
    fsCheck.onchange = () => {
      this.settings.fullscreen = fsCheck.checked;
      if (fsCheck.checked) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
      this.saveSettings();
    };
    
    document.getElementById('settings-btn').onclick = () => {
      panel.classList.add('visible');
    };
    
    document.getElementById('settings-close-btn').onclick = () => {
      panel.classList.remove('visible');
      this.updateFog();
    };
  }

  // ==================== INVENTORY SYSTEM ====================

  setupInventoryUI() {
    this.updateInventoryUI();
  }

  /* Put updateInventoryUI, getCreativeItems, createInventorySlot, getDurabilityColor,
     handleInventoryClick methods here */
  updateInventoryUI() {
    const mainInv = document.getElementById('main-inventory');
    const hotbarInv = document.getElementById('hotbar-inventory');
    const recipeList = document.getElementById('recipe-list');
    
    mainInv.innerHTML = '';
    hotbarInv.innerHTML = '';
    recipeList.innerHTML = '';
    
    for (let i = 0; i < 27; i++) {
      const slot = this.createInventorySlot(this.inventorySlots[i], 'inventory', i);
      mainInv.appendChild(slot);
    }
    
    for (let i = 0; i < 9; i++) {
      const slot = this.createInventorySlot(this.hotbarSlots[i], 'hotbar', i);
      hotbarInv.appendChild(slot);
    }
    
    const recipes = this.gameMode === 'creative' ? this.getCreativeItems() : RECIPES;
    
    if (this.gameMode === 'creative') {
      recipes.forEach(item => {
        const recipeEl = document.createElement('div');
        recipeEl.className = 'recipe-item can-craft';
        recipeEl.innerHTML = `<span class="recipe-result">${item.name}</span>`;
        recipeEl.onclick = () => this.giveItem(item.id, 64);
        recipeList.appendChild(recipeEl);
      });
    } else {
      RECIPES.forEach(recipe => {
        const canCraft = this.canCraftRecipe(recipe);
        const recipeEl = document.createElement('div');
        recipeEl.className = 'recipe-item' + (canCraft ? ' can-craft' : '');
        
        const ingredientStr = recipe.ingredients.map(ing => {
          const name = this.getItemName(ing.item);
          const has = this.countItem(ing.item);
          return `${has}/${ing.count} ${name}`;
        }).join(' + ');
        
        recipeEl.innerHTML = `
          <span class="recipe-ingredients">${ingredientStr}</span>
          <span class="recipe-arrow">→</span>
          <span class="recipe-result">${recipe.resultCount}x ${recipe.name}</span>
        `;
        
        if (canCraft) {
          recipeEl.onclick = () => this.craftRecipe(recipe);
        }
        
        recipeList.appendChild(recipeEl);
      });
    }
    // Show held item cursor
    const existingCursor = document.getElementById('held-item-cursor');
    if (existingCursor) existingCursor.remove();
    
    if (this.heldInventoryItem) {
      const cursor = document.createElement('div');
      cursor.id = 'held-item-cursor';
      cursor.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 10000;
        transform: translate(-50%, -50%);
      `;
      
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      this.drawItemIcon(canvas, this.heldInventoryItem.id);
      cursor.appendChild(canvas);
      
      if (this.heldInventoryItem.count > 1) {
        const count = document.createElement('span');
        count.style.cssText = 'position:absolute;bottom:0;right:0;color:#fff;font-size:12px;text-shadow:1px 1px #000;';
        count.textContent = this.heldInventoryItem.count;
        cursor.appendChild(count);
      }
      
      document.body.appendChild(cursor);
      
      this.updateHeldItemCursor(this.mouse.x,this.mouse.y) // show item on initial click
      document.addEventListener('mousemove', (e) => { this.updateHeldItemCursor(e.clientX, e.clientY) });
    }
  }
  // Add method to class:
  updateHeldItemCursor(x,y) {
    const cursor = document.getElementById('held-item-cursor');
    if (cursor) {
      cursor.style.left = x + 'px';
      cursor.style.top = y + 'px';
    }
  }

  getCreativeItems() {
    const items = [];
    for (const [id, data] of Object.entries(BLOCK_DATA)) {
      items.push({ id: parseInt(id), name: data.name });
    }
    for (const [id, data] of Object.entries(ITEM_DATA)) {
      items.push({ id: parseInt(id), name: data.name });
    }
    return items;
  }

  createInventorySlot(slotData, type, index) {
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    
    // Add holding indicator
    if (this.heldInventoryItem !== null) {
      slot.classList.add('can-place');
    }
    
    if (slotData) {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      this.drawItemIcon(canvas, slotData.id);
      slot.appendChild(canvas);
      
      if (slotData.count > 1) {
        const count = document.createElement('span');
        count.className = 'slot-count';
        count.textContent = slotData.count;
        slot.appendChild(count);
      }
      
      const itemData = ITEM_DATA[slotData.id];
      if (itemData?.durability && slotData.durability !== undefined) {
        const durBar = document.createElement('div');
        durBar.className = 'durability-bar';
        const durFill = document.createElement('div');
        durFill.className = 'durability-fill';
        durFill.style.width = (slotData.durability / itemData.durability * 100) + '%';
        durFill.style.background = this.getDurabilityColor(slotData.durability / itemData.durability);
        durBar.appendChild(durFill);
        slot.appendChild(durBar);
      }
    }
    
    slot.onclick = () => this.handleInventoryClick(type, index);
    
    return slot;
  }

  getDurabilityColor(ratio) {
    if (ratio > 0.6) return '#4ade80';
    if (ratio > 0.3) return '#fbbf24';
    return '#ef4444';
  }

  handleInventoryClick(type, index) {
    const slots = type === 'hotbar' ? this.hotbarSlots : this.inventorySlots;
    const clickedSlot = slots[index];
    
    if (this.heldInventoryItem === null) {
      // Pick up item from slot
      if (clickedSlot) {
        this.heldInventoryItem = { ...clickedSlot, sourceType: type, sourceIndex: index };
        slots[index] = null;
        this.updateInventoryUI();
      }
    } else {
      // Place or swap item
      if (clickedSlot === null) {
        // Place in empty slot
        slots[index] = { id: this.heldInventoryItem.id, count: this.heldInventoryItem.count };
        if (this.heldInventoryItem.durability !== undefined) {
          slots[index].durability = this.heldInventoryItem.durability;
        }
        this.heldInventoryItem = null;
      } else if (clickedSlot.id === this.heldInventoryItem.id && 
                 !ITEM_DATA[clickedSlot.id]?.isTool) {
        // Stack same items
        const canAdd = MAX_STACK_SIZE - clickedSlot.count;
        const toAdd = Math.min(canAdd, this.heldInventoryItem.count);
        clickedSlot.count += toAdd;
        this.heldInventoryItem.count -= toAdd;
        if (this.heldInventoryItem.count <= 0) {
          this.heldInventoryItem = null;
        }
      } else {
        // Swap items
        const temp = { ...clickedSlot };
        slots[index] = { id: this.heldInventoryItem.id, count: this.heldInventoryItem.count };
        if (this.heldInventoryItem.durability !== undefined) {
          slots[index].durability = this.heldInventoryItem.durability;
        }
        this.heldInventoryItem = { ...temp, sourceType: type, sourceIndex: index };
      }
      this.updateInventoryUI();
      this.updateHotbar();
    }
  }

  // ==================== HOTBAR ====================

  setupHotbar() {
    this.updateHotbar();
  }

  /* Put drawItemIcon, drawBlockIcon, drawToolIcon methods here */
  drawItemIcon(canvas, itemId) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);
    
    if (BLOCK_DATA[itemId]) {
      this.drawBlockIcon(canvas, itemId);
    } else if (ITEM_DATA[itemId]) {
      this.drawToolIcon(canvas, itemId);
    }
  }

  drawBlockIcon(canvas, type) {
    const ctx = canvas.getContext('2d');
    const data = BLOCK_DATA[type];
    if (!data) return;
  
    // If we have a texture atlas loaded and in a browser context
    if (this.textureAtlas && this.textureAtlas.image) {
      const tex = data.tex;
      if (tex) {
        const atlasImg = this.textureAtlas.image;
        const tilePixels = atlasImg.width / ATLAS_SIZE;
        
        // Draw isometric block using texture
        const topTex = tex.top || tex.side;
        const sideTex = tex.side;
        
        // For simplicity, just draw the top texture
        // You could enhance this to draw all 3 visible faces
        const [col, row] = topTex || [0, 0];
        const srcX = col * tilePixels;
        // Flip Y since image Y is top-down but our rows are bottom-up
        const srcY = atlasImg.height - (row + 1) * tilePixels;
        
        // Draw a simple representation
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        
        // Top face
        ctx.setTransform(1, 0.5, -1, 0.5, 16, 4);
        ctx.drawImage(atlasImg, srcX, srcY, tilePixels, tilePixels, -8, -8, 16, 16);
        
        // Left face (darker)
        const [sCol, sRow] = sideTex || topTex || [0, 0];
        const sSrcX = sCol * tilePixels;
        const sSrcY = atlasImg.height - (sRow + 1) * tilePixels;
        
        ctx.setTransform(1, 0.5, 0, 1, 4, 10);
        ctx.globalAlpha = 0.8;
        ctx.drawImage(atlasImg, sSrcX, sSrcY, tilePixels, tilePixels, 0, 0, 12, 14);
        
        // Right face (even darker)
        ctx.setTransform(1, -0.5, 0, 1, 16, 16);
        ctx.globalAlpha = 0.6;
        ctx.drawImage(atlasImg, sSrcX, sSrcY, tilePixels, tilePixels, 0, 0, 12, 14);
        
        ctx.restore();
        return;
      }
    }
  
    // Fallback to color-based drawing
    const toRGB = hex => `rgb(${(hex>>16)&255},${(hex>>8)&255},${hex&255})`;
    const darken = (hex, f) => {
      let r = ((hex>>16)&255)*f, g = ((hex>>8)&255)*f, b = (hex&255)*f;
      return `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
    };
  
    ctx.fillStyle = toRGB(data.top);
    ctx.beginPath();
    ctx.moveTo(16, 4); ctx.lineTo(28, 10); ctx.lineTo(16, 16); ctx.lineTo(4, 10);
    ctx.closePath(); ctx.fill();
  
    ctx.fillStyle = darken(data.side, 0.6);
    ctx.beginPath();
    ctx.moveTo(4, 10); ctx.lineTo(16, 16); ctx.lineTo(16, 28); ctx.lineTo(4, 22);
    ctx.closePath(); ctx.fill();
  
    ctx.fillStyle = darken(data.side, 0.8);
    ctx.beginPath();
    ctx.moveTo(28, 10); ctx.lineTo(16, 16); ctx.lineTo(16, 28); ctx.lineTo(28, 22);
    ctx.closePath(); ctx.fill();
  }

  drawToolIcon(canvas, itemId) {
    const ctx = canvas.getContext('2d');
    const data = ITEM_DATA[itemId];
    if (!data) return;
    
    const toRGB = hex => `rgb(${(hex>>16)&255},${(hex>>8)&255},${hex&255})`;
    ctx.fillStyle = toRGB(data.color);
    
    if (data.toolType === 'pickaxe') {
      ctx.fillRect(14, 2, 4, 4);
      ctx.fillRect(10, 6, 12, 4);
      ctx.fillRect(14, 10, 4, 18);
    } else if (data.toolType === 'axe') {
      ctx.fillRect(18, 2, 8, 8);
      ctx.fillRect(14, 6, 4, 4);
      ctx.fillRect(14, 10, 4, 18);
    } else if (data.toolType === 'shovel') {
      ctx.fillRect(12, 2, 8, 10);
      ctx.fillRect(14, 12, 4, 16);
    } else if (data.name?.includes('Sword')) {
      ctx.fillRect(14, 2, 4, 20);
      ctx.fillRect(10, 22, 12, 4);
      ctx.fillRect(14, 26, 4, 4);
    } else {
      ctx.beginPath();
      ctx.arc(16, 16, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* Put updateHotbar method here */
  updateHotbar() {
    const container = document.getElementById('hotbar');
    container.innerHTML = '';

    for (let i = 0; i < 9; i++) {
      const slotData = this.hotbarSlots[i];
      const slot = document.createElement('div');
      slot.className = 'hotbar-slot' + (i === this.selectedSlot ? ' selected' : '');

      if (slotData) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        this.drawItemIcon(canvas, slotData.id);
        slot.appendChild(canvas);
        
        if (slotData.count > 1) {
          const count = document.createElement('span');
          count.className = 'slot-count';
          count.textContent = slotData.count;
          slot.appendChild(count);
        }

        const name = document.createElement('span');
        name.className = 'slot-name';
        name.textContent = this.getItemName(slotData.id);
        slot.appendChild(name);
        
        const itemData = ITEM_DATA[slotData.id];
        if (itemData?.durability && slotData.durability !== undefined) {
          const durBar = document.createElement('div');
          durBar.className = 'durability-bar';
          const durFill = document.createElement('div');
          durFill.className = 'durability-fill';
          durFill.style.width = (slotData.durability / itemData.durability * 100) + '%';
          durFill.style.background = this.getDurabilityColor(slotData.durability / itemData.durability);
          durBar.appendChild(durFill);
          slot.appendChild(durBar);
        }
      }

      const num = document.createElement('span');
      num.className = 'slot-number';
      num.textContent = i + 1;
      slot.appendChild(num);

      slot.onclick = () => { this.selectedSlot = i; this.updateHotbar(); };
      container.appendChild(slot);
    }
  }

  getItemName(itemId) {
    if (BLOCK_DATA[itemId]) return BLOCK_DATA[itemId].name;
    if (ITEM_DATA[itemId]) return ITEM_DATA[itemId].name;
    return 'Unknown';
  }

  getHeldItem() {
    return this.hotbarSlots[this.selectedSlot];
  }

  getHeldTool() {
    const held = this.getHeldItem();
    if (!held) return null;
    const data = ITEM_DATA[held.id];
    if (data?.isTool) return { ...data, durability: held.durability, slotIndex: this.selectedSlot };
    return null;
  }

  /* Put addToInventory, removeFromInventory, countItem, giveItem, canCraftRecipe, 
     craftRecipe, damageTool methods here */
  addToInventory(itemId, count = 1, durability = undefined) {
    const itemData = ITEM_DATA[itemId];
    const isStackable = itemData?.stackable !== false && !itemData?.isTool;
    
    let remaining = count;
    
    if (isStackable) {
      for (let i = 0; i < this.hotbarSlots.length && remaining > 0; i++) {
        const slot = this.hotbarSlots[i];
        if (slot && slot.id === itemId && slot.count < MAX_STACK_SIZE) {
          const add = Math.min(remaining, MAX_STACK_SIZE - slot.count);
          slot.count += add;
          remaining -= add;
        }
      }
      
      for (let i = 0; i < this.inventorySlots.length && remaining > 0; i++) {
        const slot = this.inventorySlots[i];
        if (slot && slot.id === itemId && slot.count < MAX_STACK_SIZE) {
          const add = Math.min(remaining, MAX_STACK_SIZE - slot.count);
          slot.count += add;
          remaining -= add;
        }
      }
    }
    
    while (remaining > 0) {
      const addCount = isStackable ? Math.min(remaining, MAX_STACK_SIZE) : 1;
      let added = false;
      
      for (let i = 0; i < this.hotbarSlots.length; i++) {
        if (!this.hotbarSlots[i]) {
          this.hotbarSlots[i] = { 
            id: itemId, 
            count: addCount,
            durability: durability !== undefined ? durability : (ITEM_DATA[itemId]?.durability)
          };
          remaining -= addCount;
          added = true;
          break;
        }
      }
      
      if (!added) {
        for (let i = 0; i < this.inventorySlots.length; i++) {
          if (!this.inventorySlots[i]) {
            this.inventorySlots[i] = { 
              id: itemId, 
              count: addCount,
              durability: durability !== undefined ? durability : (ITEM_DATA[itemId]?.durability)
            };
            remaining -= addCount;
            added = true;
            break;
          }
        }
      }
      
      if (!added) break;
    }
    
    this.updateHotbar();
    if (this.inventoryOpen) this.updateInventoryUI();
    
    return remaining === 0;
  }

  removeFromInventory(itemId, count = 1) {
    let remaining = count;
    
    for (let i = 0; i < this.hotbarSlots.length && remaining > 0; i++) {
      const slot = this.hotbarSlots[i];
      if (slot && slot.id === itemId) {
        const remove = Math.min(remaining, slot.count);
        slot.count -= remove;
        remaining -= remove;
        if (slot.count <= 0) this.hotbarSlots[i] = null;
      }
    }
    
    for (let i = 0; i < this.inventorySlots.length && remaining > 0; i++) {
      const slot = this.inventorySlots[i];
      if (slot && slot.id === itemId) {
        const remove = Math.min(remaining, slot.count);
        slot.count -= remove;
        remaining -= remove;
        if (slot.count <= 0) this.inventorySlots[i] = null;
      }
    }
    
    this.updateHotbar();
    if (this.inventoryOpen) this.updateInventoryUI();
    
    return remaining === 0;
  }

  countItem(itemId) {
    let count = 0;
    for (const slot of this.hotbarSlots) {
      if (slot && slot.id === itemId) count += slot.count;
    }
    for (const slot of this.inventorySlots) {
      if (slot && slot.id === itemId) count += slot.count;
    }
    return count;
  }

  giveItem(itemId, count = 1) {
    const itemData = ITEM_DATA[itemId];
    this.addToInventory(itemId, count, itemData?.durability);
  }

  canCraftRecipe(recipe) {
    for (const ing of recipe.ingredients) {
      if (this.countItem(ing.item) < ing.count) return false;
    }
    return true;
  }

  craftRecipe(recipe) {
    if (!this.canCraftRecipe(recipe)) return false;
    
    for (const ing of recipe.ingredients) {
      this.removeFromInventory(ing.item, ing.count);
    }
    
    const resultData = ITEM_DATA[recipe.result];
    this.addToInventory(recipe.result, recipe.resultCount, resultData?.durability);
    
    this.updateInventoryUI();
    return true;
  }

  damageTool(slotIndex) {
    const slot = this.hotbarSlots[slotIndex];
    if (!slot) return;
    
    const itemData = ITEM_DATA[slot.id];
    if (!itemData?.isTool) return;
    
    slot.durability--;
    
    if (slot.durability <= 0) {
      this.hotbarSlots[slotIndex] = null;
    }
    
    this.updateHotbar();
  }

  // ==================== GAME MODE ====================

  updateGameModeIndicator() {
    const indicator = document.getElementById('gamemode-indicator');
    if (this.gameMode === 'creative') {
      indicator.textContent = 'Creative' + (this.isFlying ? ' (Flying)' : '');
      indicator.className = 'creative';
    } else {
      indicator.textContent = 'Survival';
      indicator.className = 'survival';
    }
    this.updateHealthBar();
    if (this.inventoryOpen) this.updateInventoryUI();
  }

  toggleGameMode() {
    this.gameMode = this.gameMode === 'survival' ? 'creative' : 'survival';
    if (this.gameMode === 'survival') {
      this.isFlying = false;
    }
    if (this.gameMode === 'creative') {
      this.player.health = MAX_HEALTH;
    }
    this.updateGameModeIndicator();
  }

  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    const invScreen = document.getElementById('inventory-screen');
    
    if (this.inventoryOpen) {
      invScreen.classList.add('visible');
      document.exitPointerLock();
      this.updateInventoryUI();
    } else {
      invScreen.classList.remove('visible');
      
      // Drop held item if closing inventory while holding something
      if (this.heldInventoryItem) {
        const throwDir = new THREE.Vector3(0, 0, -1);
        throwDir.applyQuaternion(this.camera.quaternion);
        throwDir.multiplyScalar(3);
        throwDir.y += 2;
        
        const spawnPos = this.player.position.clone();
        this.spawnDroppedItem(
          spawnPos.x, spawnPos.y, spawnPos.z,
          this.heldInventoryItem.id,
          this.heldInventoryItem.count,
          throwDir
        );
        this.heldInventoryItem = null;
        
        const cursor = document.getElementById('held-item-cursor');
        if (cursor) cursor.remove();
      }
      
      if (this.isPlaying && !this.isPaused) {
        this.renderer.domElement.requestPointerLock();
      }
    }
  }

  // ==================== EVENT LISTENERS ====================

  /* Put setupEventListeners method here - handles all keyboard, mouse, and other events */
  setupEventListeners() {
    document.getElementById('start-btn').onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.currentSlot) {
        const saves = this.saveManager.getAllSaves();
        if (saves[this.currentSlot]) {
          this.startGame(false);
        }
      }
    };

    document.getElementById('respawn-btn').onclick = () => {
      this.respawn();
    };
    addEventListener("mousedown", (e) => {
      this.mouse.x = e.clientX
      this.mouse.y = e.clientY
    })
    addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX
      this.mouse.y = e.clientY
    })

    document.addEventListener('keydown', e => {
      if (e.code === 'KeyQ' && this.isPlaying && !this.isPaused && !this.inventoryOpen && !this.player.isDead) {
        const heldItem = this.getHeldItem();
        if (heldItem) {
          // Calculate throw direction from camera
          const throwDir = new THREE.Vector3(0, 0, -1);
          throwDir.applyQuaternion(this.camera.quaternion);
          throwDir.multiplyScalar(5);  // Throw speed
          throwDir.y += 2;  // Arc upward slightly
          
          // Spawn in front of player
          const spawnPos = this.player.position.clone();
          spawnPos.y -= 0.5;
          spawnPos.addScaledVector(throwDir.clone().normalize(), 0.5);
          
          // Drop one item (or all if shift held)
          const dropCount = this.keys['ShiftLeft'] ? heldItem.count : 1;
          
          this.spawnDroppedItem(
            spawnPos.x,
            spawnPos.y,
            spawnPos.z,
            heldItem.id,
            dropCount,
            throwDir
          );
          
          // Remove from hotbar
          heldItem.count -= dropCount;
          if (heldItem.count <= 0) {
            this.hotbarSlots[this.selectedSlot] = null;
          }
          this.updateHotbar();
        }
      }
      if (this.keys[e.code]) return;
      this.keys[e.code] = true;
      
      if (e.code === 'F5' && this.isPlaying && !this.isPaused) {
        e.preventDefault();
        this.saveGame(true);
        return;
      }
      
      if (e.code === 'KeyE' && this.isPlaying && !this.isPaused && !this.player.isDead) {
        this.toggleInventory();
        e.preventDefault();
        return;
      }
      
      if (this.inventoryOpen) return;
      
      if (e.code.startsWith('Digit') && e.code.length === 6) {
        const n = parseInt(e.code[5]) - 1;
        if (n >= 0 && n < 9) {
          this.selectedSlot = n;
          this.updateHotbar();
        }
      }
      
      if (e.code === 'KeyC' && this.isPlaying && !this.isPaused) {
        this.toggleGameMode();
      }
      
      if (e.code === 'Space' && this.gameMode === 'creative') {
        const now = performance.now();
        if (now - this.lastSpacePress < 300) {
          this.isFlying = !this.isFlying;
          this.player.velocity.y = 0;
          this.updateGameModeIndicator();
        }
        this.lastSpacePress = now;
      }
      
      if (e.code === 'Escape' && this.isPlaying && !this.inventoryOpen) {
        this.saveGame(false);
        document.getElementById('settings-panel').classList.add('visible');
        document.exitPointerLock();
      }
      
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    document.addEventListener('keyup', e => this.keys[e.code] = false);

    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement && this.isPlaying && !this.isPaused && !this.inventoryOpen) {
        const sens = this.settings.sensitivity * 0.002;
        this.player.yaw -= e.movementX * sens;
        this.player.pitch = Math.max(-Math.PI/2 + 0.01, 
                                     Math.min(Math.PI/2 - 0.01, this.player.pitch - e.movementY * sens));
      }
    });

    document.addEventListener('mousedown', e => {
      if (!this.isPlaying || this.isPaused || this.inventoryOpen || this.player.isDead) return;
      if (!document.pointerLockElement) {
        this.renderer.domElement.requestPointerLock();
        return;
      }
      if (e.button === 0) this.breaking = true;
      else if (e.button === 2) {
        this.placing = true;
        this.placeBlock();
      }
    });

    document.addEventListener('mouseup', e => {
      if (e.button === 0) {
        this.breaking = false;
        this.breakProgress = 0;
        this.currentBreakingBlock = null;
        this.updateBreakIndicator(0);
      }
      if (e.button === 2) {
        this.placing = false;
      }
    });

    document.addEventListener('wheel', e => {
      if (!this.isPlaying || this.isPaused || this.inventoryOpen) return;
      this.selectedSlot = (this.selectedSlot + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
      this.updateHotbar();
    });

    document.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.isPlaying && !this.isPaused && !this.inventoryOpen) {
        if (!document.getElementById('settings-panel').classList.contains('visible')) {
          this.isPaused = true;
          this.saveGame(false);
          document.getElementById('menu').classList.remove('hidden');
          document.getElementById('menu').querySelector('h1').textContent = '⏸ PAUSED';
          document.getElementById('start-btn').textContent = 'Resume';
          document.getElementById('start-btn').disabled = false;
          this.updateWorldSlots();
        }
      }
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    window.addEventListener('beforeunload', () => {
      if (this.isPlaying) {
        this.saveGame(false);
      }
    });
  }

  updateBreakIndicator(progress) {
    const indicator = document.getElementById('break-indicator');
    const progressBar = document.getElementById('break-progress-bar');
    const progressFill = document.getElementById('break-progress-fill');
    
    if (progress > 0 && progress < 1) {
      indicator.classList.add('active');
      progressBar.classList.add('active');
      progressFill.style.width = (progress * 100) + '%';
      
      const inner = document.getElementById('break-indicator-inner');
      const crackSize = Math.floor(progress * 5) + 1;
      inner.style.background = `repeating-linear-gradient(
        ${45 + progress * 90}deg,
        transparent,
        transparent ${8 - crackSize}px,
        rgba(0,0,0,${0.3 + progress * 0.4}) ${8 - crackSize}px,
        rgba(0,0,0,${0.3 + progress * 0.4}) ${12 - crackSize}px
      )`;
    } else {
      indicator.classList.remove('active');
      progressBar.classList.remove('active');
    }
  }

  // ==================== WORLD RESET & START ====================

  resetWorld() {
    this.chunks.clear();
    this.chunkMeshes.forEach((group) => {
      this.scene.remove(group);
      group.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    });
    this.chunkMeshes.clear();
    this.modifiedBlocks.clear();
    this.pendingChunks.clear();
    
    this.particleSystem.forEach(p => {
      this.scene.remove(p);
      p.geometry.dispose();
      p.material.dispose();
    });
    this.particleSystem = [];
    
    this.player.position.set(8, 50, 8);
    this.player.velocity.set(0, 0, 0);
    this.player.yaw = 0;
    this.player.pitch = 0;
    this.player.health = MAX_HEALTH;
    this.player.onGround = false;
    this.player.inWater = false;
    this.player.fallStartY = null;
    this.player.isDead = false;
    
    this.hotbarSlots = new Array(9).fill(null);
    this.inventorySlots = new Array(27).fill(null);
    this.selectedSlot = 0;
    
    this.gameMode = 'survival';
    this.isFlying = false;
    this.droppedItems.forEach(item => {
      this.scene.remove(item.mesh);
      item.mesh.geometry.dispose();
      item.mesh.material.dispose();
    });
    this.droppedItems = [];
  }

  async startGame(isNewWorld = false) {
    const menu = document.getElementById('menu');
    const menuTitle = menu.querySelector('h1');
    const menuButton = document.getElementById('start-btn');

    menu.classList.add('hidden');
    document.getElementById('settings-panel').classList.remove('visible');
    document.getElementById('new-world-form').classList.remove('visible');

    if (!this.isPlaying || isNewWorld) {
      document.getElementById('loading').classList.add('show');
      document.getElementById('loading-text').textContent = 
        isNewWorld ? 'Creating New World...' : 'Loading World...';
      await new Promise(r => setTimeout(r, 50));

      if (isNewWorld) {
        this.resetWorld();
      } else {
        this.resetWorld();
        this.loadGame(this.currentSlot);
      }

      // Initialize noise with seed
      this.noise = new SimplexNoise(this.worldSeed);
      this.noiseDetail = new SimplexNoise(this.worldSeed + 1000);

      // Initialize worker with seed
      if (this.chunkWorker) {
        this.chunkWorker.postMessage({ type: 'init', seed: this.worldSeed });
      }
      
      if (isNewWorld) {
        this.findSpawnPoint();
      }
      
      this.isPlaying = true;
      this.updateShadows();
      this.startAutosave();

      document.getElementById('loading').classList.remove('show');
      this.lastTime = performance.now();
      this.gameLoop();
    }

    this.isPaused = false;
    menuTitle.textContent = '⛏ MINECRAFT';
    menuButton.textContent = 'Play Selected World';
    this.updateGameModeIndicator();
    this.updateHotbar();
    this.updateHealthBar();
    
    document.getElementById('world-info').textContent = `World: ${this.worldName} (Seed: ${this.worldSeed})`;

    await new Promise(r => setTimeout(r, 50));

    try {
      await this.renderer.domElement.requestPointerLock();
    } catch (err) {}
  }

  // ==================== WORLD GENERATION ====================

  getTerrainHeight(x, z) {
    const scale = 0.008;
    const detailScale = 0.03;

    let base = this.noise.octave(x * scale, z * scale, 4, 0.5);
    let detail = this.noiseDetail.octave(x * detailScale, z * detailScale, 2, 0.5);

    let height = 20 + base * 25 + detail * 5;

    let mountain = this.noise.octave(x * 0.004, z * 0.004, 3, 0.4);
    if (mountain > 0.3) {
      height += (mountain - 0.3) * 60;
    }

    return Math.floor(height);
  }

  getBiome(x, z) {
    const temp = this.noise.noise2D(x * 0.002, z * 0.002);
    const moisture = this.noiseDetail.noise2D(x * 0.003, z * 0.003);

    if (temp > 0.4) return 'desert';
    if (temp < -0.4) return 'snow';
    if (moisture > 0.3) return 'forest';
    return 'plains';
  }

  queueMeshBuild(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.pendingMeshes.has(key)) return;
    if (!this.chunks.has(key)) return;
    
    const pcx = Math.floor(this.player.position.x / CHUNK_SIZE);
    const pcz = Math.floor(this.player.position.z / CHUNK_SIZE);
    const dist = (cx - pcx) * (cx - pcx) + (cz - pcz) * (cz - pcz);
    
    // Check if already in queue
    const existing = this.meshBuildQueue.findIndex(q => q.cx === cx && q.cz === cz);
    if (existing !== -1) {
      this.meshBuildQueue[existing].dist = dist;
    } else {
      this.meshBuildQueue.push({ cx, cz, dist });
    }
    
    // Sort by distance (closer chunks first)
    this.meshBuildQueue.sort((a, b) => a.dist - b.dist);
  }
  queueMeshBuildPriority(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.pendingMeshes.has(key)) return;
    if (!this.chunks.has(key)) return;
    
    // Remove from queue if already present
    this.meshBuildQueue = this.meshBuildQueue.filter(q => !(q.cx === cx && q.cz === cz));
    
    // Insert at front of queue (highest priority)
    this.meshBuildQueue.unshift({ cx, cz, dist: -1 });
  }
  rebuildChunkMeshNow(cx, cz) {
    const key = `${cx},${cz}`;
    
    if (!this.chunks.has(key)) return;
    if (!this.chunkWorker) return;
    
    // Remove from queue if present
    this.meshBuildQueue = this.meshBuildQueue.filter(q => !(q.cx === cx && q.cz === cz));
    
    this.pendingMeshes.set(key, true);
    
    // Gather neighbor chunks
    const neighbors = {};
    const neighborOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
    
    for (const [dx, dz] of neighborOffsets) {
      const nkey = `${cx + dx},${cz + dz}`;
      if (this.chunks.has(nkey)) {
        neighbors[nkey] = this.chunks.get(nkey).slice().buffer;
      }
    }
    
    // Get modifications
    const modifiedBlocks = {};
    this.modifiedBlocks.forEach((value, modKey) => {
      const [mx, my, mz] = modKey.split(',').map(Number);
      const mcx = Math.floor(mx / CHUNK_SIZE);
      const mcz = Math.floor(mz / CHUNK_SIZE);
      if (Math.abs(mcx - cx) <= 1 && Math.abs(mcz - cz) <= 1) {
        modifiedBlocks[modKey] = value;
      }
    });
    
    const chunk = this.chunks.get(key);
    const chunkBuffer = chunk.slice().buffer;
    
    const transferList = [chunkBuffer];
    Object.values(neighbors).forEach(buf => transferList.push(buf));
    
    this.chunkWorker.postMessage({
      type: 'buildMesh',
      id: this.chunkRequestId++,
      cx, cz,
      chunk: chunkBuffer,
      neighbors,
      modifiedBlocks
    }, transferList);
  }

  processMeshBuildQueue() {
    if (this.meshBuildQueue.length === 0) return;
    if (!this.chunkWorker) {
      alert("ERROR: chunk worker not available")
      return;
    }
    
    // Send up to 2 mesh build requests per frame
    const maxPerFrame = 8;
    let processed = 0;
    
    while (this.meshBuildQueue.length > 0 && processed < maxPerFrame) {
      const { cx, cz } = this.meshBuildQueue.shift();
      const key = `${cx},${cz}`;
      
      if (!this.chunks.has(key) || this.pendingMeshes.has(key)) continue;
      
      this.pendingMeshes.set(key, true);
      
      // Gather neighbor chunks for proper AO at edges
      const neighbors = {};
      const neighborOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
      
      for (const [dx, dz] of neighborOffsets) {
        const nkey = `${cx + dx},${cz + dz}`;
        if (this.chunks.has(nkey)) {
          // Copy the buffer so we can transfer it
          const neighborChunk = this.chunks.get(nkey);
          neighbors[nkey] = neighborChunk.slice().buffer;
        }
      }
      
      // Get modifications for this chunk area
      const modifiedBlocks = {};
      this.modifiedBlocks.forEach((value, modKey) => {
        const [mx, my, mz] = modKey.split(',').map(Number);
        const mcx = Math.floor(mx / CHUNK_SIZE);
        const mcz = Math.floor(mz / CHUNK_SIZE);
        // Include if in this chunk or adjacent
        if (Math.abs(mcx - cx) <= 1 && Math.abs(mcz - cz) <= 1) {
          modifiedBlocks[modKey] = value;
        }
      });
      
      const chunk = this.chunks.get(key);
      const chunkBuffer = chunk.slice().buffer;
      
      const transferList = [chunkBuffer];
      Object.values(neighbors).forEach(buf => transferList.push(buf));
      
      this.chunkWorker.postMessage({
        type: 'buildMesh',
        id: this.chunkRequestId++,
        cx, cz,
        chunk: chunkBuffer,
        neighbors,
        modifiedBlocks
      }, transferList);
      
      processed++;
    }
  }

  createMeshFromGeometry(cx, cz, geometry) {
    const key = `${cx},${cz}`;
    
    if (this.chunkMeshes.has(key)) {
      const oldGroup = this.chunkMeshes.get(key);
      this.scene.remove(oldGroup);
      oldGroup.children.forEach(mesh => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
    }
    
    const group = new THREE.Group();
    
    const createMesh = (data, isTrans) => {
      if (!data.positions || data.positions.length === 0) return;
      
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
      
      if (data.normals && data.normals.length > 0) {
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
      } else {
        geo.computeVertexNormals();
      }
      
      // Add UV attribute if available
      if (data.uvs && data.uvs.length > 0) {
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
      }
      
      // Create material based on whether texture is loaded
      let mat;
      
      if (this.textureLoaded && this.textureAtlas && data.uvs && data.uvs.length > 0) {
        // Textured material
        mat = new THREE.MeshStandardMaterial({
          map: this.textureAtlas,
          vertexColors: true,  // Colors are used for AO tinting
          transparent: isTrans,
          alphaTest: isTrans ? 0.5 : 0,  // Cut out transparent pixels
          depthWrite: !isTrans || !this.textureAtlas,  // Write depth unless transparent texture
          roughness: 0.9,
          metalness: 0.0,
          side: isTrans ? THREE.DoubleSide : THREE.FrontSide
        });
      } else {
        // Fallback color-only material
        mat = new THREE.MeshStandardMaterial({
          vertexColors: true,
          transparent: isTrans,
          opacity: isTrans ? 0.8 : 1.0,
          depthWrite: !isTrans,
          roughness: 0.8,
          side: isTrans ? THREE.DoubleSide : THREE.FrontSide
        });
      }
      
      const mesh = new THREE.Mesh(geo, mat);
      
      if (this.settings.shadowsEnabled && !isTrans) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      
      group.add(mesh);
    };
    
    createMesh(geometry.opaque, false);
    createMesh(geometry.transparent, true);
    
    this.scene.add(group);
    this.chunkMeshes.set(key, group);
  }
  
  checkBlockSupport(x, y, z) {
    const block = this.getBlock(x, y, z);
    if (block === BLOCK.AIR) return;
    
    const blockData = BLOCK_DATA[block];
    if (!blockData || !blockData.placedOn) return;
    
    const blockBelow = this.getBlock(x, y - 1, z);
    
    // Check if the block below is valid support
    if (!blockData.placedOn.includes(blockBelow)) {
      // Block loses support - break it and drop item
      this.setBlock(x, y, z, BLOCK.AIR);
      
      // Handle drops
      let dropItem = block;
      if (blockData.drops === null) {
        // Check for rare drops
        if (blockData.rareDrops && Math.random() < blockData.rareDrops.chance) {
          dropItem = blockData.rareDrops.item;
        } else {
          dropItem = null;
        }
      } else if (blockData.drops !== undefined) {
        dropItem = blockData.drops;
      }
      
      if (dropItem !== null) {
        this.spawnDroppedItem(x + 0.5, y + 0.5, z + 0.5, dropItem, 1);
      }
    }
  }

  generateChunk(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.chunks.has(key) || this.pendingChunks.has(key)) return;

    if (this.chunkWorker) {
      this.pendingChunks.set(key, true);
      
      // Gather existing neighbor chunks for mesh building
      const neighbors = {};
      const neighborOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
      
      for (const [dx, dz] of neighborOffsets) {
        const nkey = `${cx + dx},${cz + dz}`;
        if (this.chunks.has(nkey)) {
          neighbors[nkey] = this.chunks.get(nkey).slice().buffer;
        }
      }
      
      // Get relevant modifications
      const modifiedBlocks = {};
      this.modifiedBlocks.forEach((value, modKey) => {
        const [mx, my, mz] = modKey.split(',').map(Number);
        const mcx = Math.floor(mx / CHUNK_SIZE);
        const mcz = Math.floor(mz / CHUNK_SIZE);
        if (Math.abs(mcx - cx) <= 1 && Math.abs(mcz - cz) <= 1) {
          modifiedBlocks[modKey] = value;
        }
      });
      
      const transferList = [];
      Object.values(neighbors).forEach(buf => transferList.push(buf));
      
      // Use generateAndBuild if we have neighbors, otherwise just generate
      const hasNeighbors = Object.keys(neighbors).length >= 4;
      
      if (hasNeighbors) {
        this.pendingMeshes.set(key, true);
        this.chunkWorker.postMessage({
          type: 'generateAndBuild',
          id: this.chunkRequestId++,
          cx, cz,
          seed: this.worldSeed,
          neighbors,
          modifiedBlocks
        }, transferList);
      } else {
        this.chunkWorker.postMessage({
          type: 'generate',
          id: this.chunkRequestId++,
          cx, cz,
          seed: this.worldSeed
        });
      }
      return;
    }
  }

  applyModificationsToChunk(cx, cz) {
    const chunk = this.chunks.get(`${cx},${cz}`);
    if (!chunk) return;
    
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let y = 0; y < WORLD_HEIGHT; y++) {
          const wx = cx * CHUNK_SIZE + lx;
          const wz = cz * CHUNK_SIZE + lz;
          const key = `${wx},${y},${wz}`;
          
          if (this.modifiedBlocks.has(key)) {
            const idx = lx + y * CHUNK_SIZE + lz * CHUNK_SIZE * WORLD_HEIGHT;
            chunk[idx] = this.modifiedBlocks.get(key);
          }
        }
      }
    }
  }

  findSpawnPoint() {
    let x = 8, z = 8;
    let y = this.getTerrainHeight(x, z) + 2;
    this.player.position.set(x + 0.5, y+0.1, z + 0.5);
  }

  getBlock(x, y, z) {
    const key = `${x},${y},${z}`;
    if (this.modifiedBlocks.has(key)) return this.modifiedBlocks.get(key);

    if (y < 0 || y >= WORLD_HEIGHT) return BLOCK.AIR;

    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.chunks.get(`${cx},${cz}`);

    if (!chunk) return BLOCK.AIR;

    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk[lx + y * CHUNK_SIZE + lz * CHUNK_SIZE * WORLD_HEIGHT];
  }

  setBlock(x, y, z, type) {
    if (y < 0 || y >= WORLD_HEIGHT) return;
  
    this.modifiedBlocks.set(`${x},${y},${z}`, type);
  
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const chunk = this.chunks.get(`${cx},${cz}`);
  
    if (chunk) {
      const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      chunk[lx + y * CHUNK_SIZE + lz * CHUNK_SIZE * WORLD_HEIGHT] = type;
  
      // Priority rebuild for the main chunk (insert at front of queue)
      this.queueMeshBuildPriority(cx, cz);
      
      // Only rebuild adjacent chunks if block is on the edge (for AO correction)
      if (lx === 0) this.queueMeshBuild(cx - 1, cz);
      if (lx === CHUNK_SIZE - 1) this.queueMeshBuild(cx + 1, cz);
      if (lz === 0) this.queueMeshBuild(cx, cz - 1);
      if (lz === CHUNK_SIZE - 1) this.queueMeshBuild(cx, cz + 1);
    }
  
    if (type === BLOCK.AIR) {
      this.checkBlockSupport(x, y + 1, z);
    }
  }

  // ==================== PLAYER & PHYSICS ====================

  /* Put updatePlayer method here - handles player movement, flying, swimming */
  updatePlayer(dt) {
    if (this.player.isDead) return;
    
    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.x += 1;
    moveDir.normalize();

    const cos = Math.cos(this.player.yaw);
    const sin = Math.sin(this.player.yaw);

    const moveX = moveDir.x * cos + moveDir.z * sin;
    const moveZ = -moveDir.x * sin + moveDir.z * cos;

    if (this.isFlying) {
      const flySpeed = this.keys['ShiftLeft'] ? FLY_SPEED * 2 : FLY_SPEED;
      this.player.velocity.x = moveX * flySpeed;
      this.player.velocity.z = moveZ * flySpeed;
      
      if (this.keys['Space']) {
        this.player.velocity.y = flySpeed;
      } else if (this.keys['ShiftLeft']) {
        this.player.velocity.y = -flySpeed;
      } else {
        this.player.velocity.y = 0;
      }
    } else {
      const speed = this.keys['ShiftLeft'] ? SPRINT_SPEED : WALK_SPEED;
      const waterMult = this.player.inWater ? 0.5 : 1;

      this.player.velocity.x = moveX * speed * waterMult;
      this.player.velocity.z = moveZ * speed * waterMult;

      if (this.keys['Space']) {
        if (this.player.onGround) {
          this.player.velocity.y = JUMP_FORCE;
          this.player.onGround = false;
        } else if (this.player.inWater) {
          this.player.velocity.y = 3;
        }
      }

      const grav = this.player.inWater ? GRAVITY * 0.3 : GRAVITY;
      this.player.velocity.y -= grav * dt;
      if (this.player.inWater) {
        this.player.velocity.y = Math.max(-3, this.player.velocity.y);
      }
    }

    // Track fall start for fall damage
    if (!this.player.onGround && !this.isFlying && !this.player.inWater) {
      if (this.player.fallStartY === null && this.player.velocity.y < 0) {
        this.player.fallStartY = this.player.position.y;
      }
    }

    const wasOnGround = this.player.onGround;
    this.moveWithCollision(dt);

    // Calculate fall damage when landing
    if (this.player.onGround && !wasOnGround && this.player.fallStartY !== null) {
      const fallDistance = this.player.fallStartY - this.player.position.y;
      this.applyFallDamage(fallDistance);
      this.player.fallStartY = null;
    }

    if (this.player.onGround || this.player.inWater || this.isFlying) {
      this.player.fallStartY = null;
    }

    const headBlock = this.getBlock(
      Math.floor(this.player.position.x),
      Math.floor(this.player.position.y),
      Math.floor(this.player.position.z)
    );
    this.player.inWater = headBlock === BLOCK.WATER;

    this.camera.position.copy(this.player.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.player.yaw;
    this.camera.rotation.x = this.player.pitch;

    this.sun.position.set(
      this.player.position.x + 100,
      this.player.position.y + 200,
      this.player.position.z + 50
    );
    this.sunTarget.position.copy(this.player.position);

    const p = this.player.position;
    document.getElementById('position').textContent = 
      `XYZ: ${p.x.toFixed(1)} / ${p.y.toFixed(1)} / ${p.z.toFixed(1)}`;
  }

  applyFallDamage(fallDistance) {
    if (this.gameMode === 'creative') return;
    const damage = Math.floor(fallDistance) - 3;
    if (damage > 0) {
      this.player.health -= damage;
      this.updateHealthBar();
      if (this.player.health <= 0) {
        this.playerDie();
      }
    }
  }

  playerDie() {
    this.player.isDead = true;
    this.player.health = 0;
    this.updateHealthBar();
    document.getElementById('death-screen').classList.add('visible');
    document.exitPointerLock();
  }

  respawn() {
    this.player.isDead = false;
    this.player.health = MAX_HEALTH;
    this.player.fallStartY = null;
    this.player.velocity.set(0, 0, 0);
    this.findSpawnPoint();
    this.hotbarSlots.fill(null);
    this.inventorySlots.fill(null);
    this.updateHealthBar();
    this.updateHotbar();
    document.getElementById('death-screen').classList.remove('visible');
    this.saveGame(false);
    setTimeout(() => {
      this.renderer.domElement.requestPointerLock();
    }, 100);
  }

  moveWithCollision(dt) {
    const pos = this.player.position;
    const vel = this.player.velocity;

    if (this.isFlying) {
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      pos.z += vel.z * dt;
      return;
    }

    pos.x += vel.x * dt;
    if (this.checkCollision(pos)) { pos.x -= vel.x * dt; vel.x = 0; }

    pos.z += vel.z * dt;
    if (this.checkCollision(pos)) { pos.z -= vel.z * dt; vel.z = 0; }

    pos.y += vel.y * dt;
    if (this.checkCollision(pos)) {
      if (vel.y < 0) this.player.onGround = true;
      pos.y -= vel.y * dt;
      vel.y = 0;
    } else {
      this.player.onGround = false;
    }
  }

  checkCollision(pos) {
    const hw = PLAYER_WIDTH / 2;
    const corners = [
      [pos.x - hw, pos.y - PLAYER_HEIGHT, pos.z - hw],
      [pos.x + hw, pos.y - PLAYER_HEIGHT, pos.z - hw],
      [pos.x - hw, pos.y - PLAYER_HEIGHT, pos.z + hw],
      [pos.x + hw, pos.y - PLAYER_HEIGHT, pos.z + hw],
      [pos.x - hw, pos.y - 0.01, pos.z - hw],
      [pos.x + hw, pos.y - 0.01, pos.z - hw],
      [pos.x - hw, pos.y - 0.01, pos.z + hw],
      [pos.x + hw, pos.y - 0.01, pos.z + hw],
      [pos.x - hw, pos.y - PLAYER_HEIGHT/2, pos.z - hw],
      [pos.x + hw, pos.y - PLAYER_HEIGHT/2, pos.z + hw],
    ];

    for (const [x, y, z] of corners) {
      const block = this.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
      if (block !== BLOCK.AIR && BLOCK_DATA[block] && BLOCK_DATA[block].solid) {
        return true;
      }
    }
    return false;
  }

  // ==================== INTERACTION ====================

  updateBlockSelection() {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(this.camera.quaternion);

    this.targetBlock = null;
    this.placementBlock = null;

    let prevX, prevY, prevZ;
    for (let t = 0; t < 5; t += 0.05) {
      const x = Math.floor(this.camera.position.x + dir.x * t);
      const y = Math.floor(this.camera.position.y + dir.y * t);
      const z = Math.floor(this.camera.position.z + dir.z * t);

      const block = this.getBlock(x, y, z);
      if (block !== BLOCK.AIR && block !== BLOCK.WATER) {
        this.targetBlock = { x, y, z };
        if (prevX !== undefined) {
          this.placementBlock = { x: prevX, y: prevY, z: prevZ };
        }
        break;
      }
      prevX = x; prevY = y; prevZ = z;
    }

    if (this.targetBlock) {
      this.highlight.position.set(
        this.targetBlock.x + 0.5,
        this.targetBlock.y + 0.5,
        this.targetBlock.z + 0.5
      );
      this.highlight.visible = true;
    } else {
      this.highlight.visible = false;
    }
  }

  canMineBlock(blockData, tool) {
    if (!blockData.minTool) return true;
    if (!tool) return false;
    const minTierIndex = TOOL_TIERS.indexOf(blockData.minTool);
    const toolTierIndex = TOOL_TIERS.indexOf(tool.toolTier);
    return toolTierIndex >= minTierIndex;
  }

  getMiningSpeed(blockData, tool) {
    if (this.gameMode === 'creative') return 1000; // Arbitrary high number
    if (!tool) return 1;
    if (tool.toolType === blockData.toolType) {
      return tool.miningSpeed;
    }
    return 1;
  }

  breakBlock() {
    if (!this.targetBlock) return;

    const { x, y, z } = this.targetBlock;
    const block = this.getBlock(x, y, z);
    const blockData = BLOCK_DATA[block];
    
    if (!blockData) return;

    const tool = this.getHeldTool();
    
    if (!this.canMineBlock(blockData, tool)) {
      this.setBlock(x, y, z, BLOCK.AIR);
      this.spawnParticles(x + 0.5, y + 0.5, z + 0.5, blockData.side);
      return;
    }

    if (tool && this.gameMode === 'survival') {
      this.damageTool(tool.slotIndex);
    }

    let dropItem = block;
    let dropCount = 1;
    
    if (blockData.drops !== undefined) {
      if (blockData.drops === null) {
        // Check for rare drops (like seeds from tall grass)
        if (blockData.rareDrops && Math.random() < blockData.rareDrops.chance) {
          dropItem = blockData.rareDrops.item;
        } else {
          dropItem = null;
        }
      } else {
        dropItem = blockData.drops;
      }
    } else if (block === BLOCK.STONE) {
      dropItem = BLOCK.COBBLE;
    }

    this.spawnParticles(x + 0.5, y + 0.5, z + 0.5, blockData.side);
    this.setBlock(x, y, z, BLOCK.AIR);
    
    if (dropItem !== null) {
      this.spawnDroppedItem(
        x + 0.5, 
        y + 0.5, 
        z + 0.5, 
        dropItem, 
        dropCount
      );
    }
    
    this.breakProgress = 0;
    this.currentBreakingBlock = null;
    this.updateBreakIndicator(0);
  }

  placeBlock() {
    if (!this.placementBlock) return;
    
    const heldItem = this.getHeldItem();
    if (!heldItem) return;
    
    const blockData = BLOCK_DATA[heldItem.id];
    if (!blockData) return;
  
    const { x, y, z } = this.placementBlock;
    
    // Check if this block requires specific support
    if (blockData.placedOn) {
      const blockBelow = this.getBlock(x, y - 1, z);
      if (!blockData.placedOn.includes(blockBelow)) {
        // Can't place here - invalid support
        return;
      }
    }

    const px = this.player.position.x;
    const py = this.player.position.y;
    const pz = this.player.position.z;

    const hw = PLAYER_WIDTH / 2;
    if (x >= Math.floor(px - hw) && x <= Math.floor(px + hw) &&
        z >= Math.floor(pz - hw) && z <= Math.floor(pz + hw) &&
        y >= Math.floor(py - PLAYER_HEIGHT) && y <= Math.floor(py)) {
      return;
    }

    if (this.gameMode === 'survival') {
      if (heldItem.count <= 1) {
        this.hotbarSlots[this.selectedSlot] = null;
      } else {
        heldItem.count--;
      }
      this.updateHotbar();
    }

    this.setBlock(x, y, z, heldItem.id);
    this.placeCooldown = this.gamemode === "creative" ? CREATIVE_PLACE_COOLDOWN : PLACE_COOLDOWN;
  }

  spawnParticles(x, y, z, color) {
    for (let i = 0; i < 25; i++) {
      const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const mat = new THREE.MeshBasicMaterial({ color });
      const particle = new THREE.Mesh(geo, mat);
      particle.position.set(
        x + (Math.random() - 0.5) * 0.5,
        y + (Math.random() - 0.5) * 0.5,
        z + (Math.random() - 0.5) * 0.5
      );
      particle.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 3
      );
      particle.life = 2.0 + Math.random() * 1.0;
      particle.maxLife = particle.life;
      this.scene.add(particle);
      this.particleSystem.push(particle);
    }
  }

  updateParticles(dt) {
    for (let i = this.particleSystem.length - 1; i >= 0; i--) {
      const p = this.particleSystem[i];
      
      p.velocity.y -= 15 * dt;
      
      const newX = p.position.x + p.velocity.x * dt;
      const newY = p.position.y + p.velocity.y * dt;
      const newZ = p.position.z + p.velocity.z * dt;
      
      const blockX = Math.floor(newX);
      const blockY = Math.floor(newY);
      const blockZ = Math.floor(newZ);
      
      const block = this.getBlock(blockX, blockY, blockZ);
      if (block !== BLOCK.AIR && BLOCK_DATA[block]?.solid) {
        if (this.getBlock(Math.floor(p.position.x), blockY, Math.floor(p.position.z)) !== BLOCK.AIR) {
          p.velocity.y = -p.velocity.y * 0.3;
          p.velocity.x *= 0.7;
          p.velocity.z *= 0.7;
        } else if (this.getBlock(blockX, Math.floor(p.position.y), Math.floor(p.position.z)) !== BLOCK.AIR) {
          p.velocity.x = -p.velocity.x * 0.3;
        } else if (this.getBlock(Math.floor(p.position.x), Math.floor(p.position.y), blockZ) !== BLOCK.AIR) {
          p.velocity.z = -p.velocity.z * 0.3;
        }
      } else {
        p.position.set(newX, newY, newZ);
      }
      
      p.life -= dt;
      
      const lifeRatio = p.life / p.maxLife;
      p.scale.setScalar(0.5 + lifeRatio * 0.5);
      p.material.opacity = lifeRatio;
      p.material.transparent = true;

      if (p.life <= 0) {
        this.scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        this.particleSystem.splice(i, 1);
      }
    }
  }

  // ==================== CHUNK MANAGEMENT ====================

  updateChunks() {
    const pcx = Math.floor(this.player.position.x / CHUNK_SIZE);
    const pcz = Math.floor(this.player.position.z / CHUNK_SIZE);

    const loadDistance = this.settings.renderDistance + 2;

    const chunksNeeded = [];
    for (let dx = -loadDistance; dx <= loadDistance; dx++) {
      for (let dz = -loadDistance; dz <= loadDistance; dz++) {
        const distSq = dx * dx + dz * dz;
        if (distSq <= loadDistance * loadDistance) {
          const cx = pcx + dx;
          const cz = pcz + dz;
          const key = `${cx},${cz}`;
          if (!this.chunks.has(key) && !this.pendingChunks.has(key)) {
            chunksNeeded.push({ cx, cz, dist: distSq });
          }
        }
      }
    }

    // Sort by distance and limit chunks per frame
    chunksNeeded.sort((a, b) => a.dist - b.dist);
    const maxChunksPerFrame = 1;
    for (let i = 0; i < Math.min(chunksNeeded.length, maxChunksPerFrame); i++) {
      this.generateChunk(chunksNeeded[i].cx, chunksNeeded[i].cz);
    }

    // Process mesh build queue
    this.processMeshBuildQueue();

    // Unload distant chunks
    const maxDist = loadDistance + 2;
    this.chunkMeshes.forEach((group, key) => {
      const [cx, cz] = key.split(',').map(Number);
      if (Math.abs(cx - pcx) > maxDist || Math.abs(cz - pcz) > maxDist) {
        this.scene.remove(group);
        group.children.forEach(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        this.chunkMeshes.delete(key);
        this.chunks.delete(key);
        this.pendingChunks.delete(key);
        this.pendingMeshes.delete(key);
      }
    });

    // Also remove from mesh queue if chunk is unloaded
    this.meshBuildQueue = this.meshBuildQueue.filter(item => {
      const key = `${item.cx},${item.cz}`;
      return this.chunks.has(key);
    });

    document.getElementById('chunk-info').textContent = 
      `Chunks: ${this.chunkMeshes.size} (${this.meshBuildQueue.length} queued)`;
  }

  // ==================== GAME LOOP ====================

  gameLoop() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.frameCount++;
    if (now - this.fpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = now;
      document.getElementById('fps').textContent = `FPS: ${this.fps}`;
    }

    if (document.pointerLockElement && !this.isPaused && !this.inventoryOpen && !this.player.isDead) {
      this.updatePlayer(dt);
      this.updateBlockSelection();

      if (this.breaking && this.targetBlock) {
        const blockKey = `${this.targetBlock.x},${this.targetBlock.y},${this.targetBlock.z}`;
        
        if (this.currentBreakingBlock !== blockKey) {
          this.breakProgress = 0;
          this.currentBreakingBlock = blockKey;
        }
      
        // Handle the universal break cooldown (0.05s)
        // Inside gameLoop(), within the (this.breaking && this.targetBlock) block:

        if (this.breakCooldown > 0) {
          this.breakCooldown -= dt;
        } else {
          // 1. Creative Mode: Bypass all hardness/progress checks
          if (this.gameMode === 'creative') {
            this.breakBlock();
            this.breakCooldown = CREATIVE_BREAK_COOLDOWN; 
          } 
          // 2. Survival Mode: Respect hardness and check for bedrock (-1)
          else {
            const block = this.getBlock(this.targetBlock.x, this.targetBlock.y, this.targetBlock.z);
            const blockData = BLOCK_DATA[block];
        
            if (blockData && blockData.hardness >= 0) {
              const tool = this.getHeldTool();
              const miningSpeed = this.getMiningSpeed(blockData, tool);
              this.breakProgress += dt * (miningSpeed / blockData.hardness);
              this.updateBreakIndicator(this.breakProgress);
              
              if (this.breakProgress >= 1) {
                this.breakBlock();
                this.breakCooldown = BREAK_COOLDOWN;
              }
            } else if (blockData && blockData.hardness === -1) {
              // In Survival, hardness -1 means we reset progress and do nothing
              this.breakProgress = 0;
              this.updateBreakIndicator(0);
            }
          }
        }
      } else {
        // If not holding break or no target, reset cooldown/progress
        if (this.breakCooldown > 0) this.breakCooldown -= dt;
        if (this.breakProgress > 0) {
          this.breakProgress = 0;
          this.currentBreakingBlock = null;
          this.updateBreakIndicator(0);
        }
      }

      if (this.placing) {
        this.placeCooldown -= dt;
        if (this.placeCooldown <= 0) {
          this.placeBlock();
        }
      }

      this.updateChunks();
    }

    this.updateParticles(dt);
    this.updateDroppedItems(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.gameLoop());
  }

  updateDroppedItems(dt) {
    const playerPos = this.player.position;
    const pickupRadius = 1.5;
    const itemHalfHeight = 0.125;  // Half of 0.25 box size
    
    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const item = this.droppedItems[i];
      
      // Update timers
      item.pickupDelay -= dt;
      item.lifetime -= dt;
      
      // Despawn if too old
      if (item.lifetime <= 0) {
        this.scene.remove(item.mesh);
        item.mesh.geometry.dispose();
        item.mesh.material.dispose();
        this.droppedItems.splice(i, 1);
        continue;
      }
      
      // Use separate physics position
      const pos = item.position;
      
      // Apply gravity only when not on ground
      if (!item.onGround) {
        item.velocity.y -= GRAVITY * dt;
        // Clamp fall speed
        item.velocity.y = Math.max(item.velocity.y, -20);
      }
      
      // X movement with collision
      const newX = pos.x + item.velocity.x * dt;
      const blockAtNewX = this.getBlock(Math.floor(newX), Math.floor(pos.y), Math.floor(pos.z));
      if (blockAtNewX !== BLOCK.AIR && BLOCK_DATA[blockAtNewX]?.solid) {
        item.velocity.x *= -0.3;
      } else {
        pos.x = newX;
      }
      
      // Z movement with collision
      const newZ = pos.z + item.velocity.z * dt;
      const blockAtNewZ = this.getBlock(Math.floor(pos.x), Math.floor(pos.y), Math.floor(newZ));
      if (blockAtNewZ !== BLOCK.AIR && BLOCK_DATA[blockAtNewZ]?.solid) {
        item.velocity.z *= -0.3;
      } else {
        pos.z = newZ;
      }
      
      // Y movement
      pos.y += item.velocity.y * dt;
      
      // Ground collision - check block at the bottom of the item
      const bottomY = pos.y - itemHalfHeight;
      const groundBlockY = Math.floor(bottomY);
      const blockBelow = this.getBlock(Math.floor(pos.x), groundBlockY, Math.floor(pos.z));
      
      // Check if we've fallen into a solid block
      if (blockBelow !== BLOCK.AIR && BLOCK_DATA[blockBelow]?.solid) {
        if (item.velocity.y <= 0) {
          // Snap to top of the solid block
          // Block at groundBlockY has its top surface at groundBlockY + 1
          // Item center should be at (top of block) + itemHalfHeight
          pos.y = groundBlockY + 1 + itemHalfHeight;
          item.velocity.y = 0;
          
          // Apply friction
          item.velocity.x *= 0.85;
          item.velocity.z *= 0.85;
          
          // Stop tiny movements
          if (Math.abs(item.velocity.x) < 0.01) item.velocity.x = 0;
          if (Math.abs(item.velocity.z) < 0.01) item.velocity.z = 0;
          
          item.onGround = true;
        }
      } else {
        item.onGround = false;
      }
      
      // Also check if inside a block (can happen on spawn) and push up
      const blockAtCenter = this.getBlock(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
      if (blockAtCenter !== BLOCK.AIR && BLOCK_DATA[blockAtCenter]?.solid) {
        pos.y = Math.floor(pos.y) + 1 + itemHalfHeight;
        item.velocity.y = 0;
        item.onGround = true;
      }
      
      // Update visual mesh position (separate from physics)
      item.mesh.position.x = pos.x;
      item.mesh.position.z = pos.z;
      
      // Bobbing only affects visual, not physics
      if (item.onGround) {
        const bobOffset = Math.sin(performance.now() * 0.003 + i) * 0.05;
        item.mesh.position.y = pos.y + bobOffset;
      } else {
        item.mesh.position.y = pos.y;
      }
      
      // Rotate for visual effect
      item.mesh.rotation.y += dt * 2;
      
      // Pickup check using physics position
      if (item.pickupDelay <= 0) {
        const dx = pos.x - playerPos.x;
        const dy = pos.y - (playerPos.y - PLAYER_HEIGHT / 2);
        const dz = pos.z - playerPos.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        
        if (distSq < pickupRadius * pickupRadius) {
          if (this.addToInventory(item.itemId, item.count)) {
            this.scene.remove(item.mesh);
            item.mesh.geometry.dispose();
            item.mesh.material.dispose();
            this.droppedItems.splice(i, 1);
          }
        }
      }
    }
  }
  spawnDroppedItem(x, y, z, itemId, count, velocity = null) {
    const geo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    const data = BLOCK_DATA[itemId] || ITEM_DATA[itemId];
    const color = data ? (data.side || data.top || data.color || 0xffffff) : 0xffffff;
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    
    const item = {
      mesh,
      itemId,
      count,
      // Separate physics position from visual mesh position
      position: new THREE.Vector3(x, y, z),
      velocity: velocity ? velocity.clone() : new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        3 + Math.random() * 2,
        (Math.random() - 0.5) * 2
      ),
      pickupDelay: 0.5,
      lifetime: 300,
      onGround: false
    };
    
    this.droppedItems.push(item);
    return item;
  }

  loadTextureAtlas() {
    const loader = new THREE.TextureLoader();
    
    loader.load(
      'assets/atlas.png',
      (texture) => {
        // Configure texture for pixelated look
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        
        this.textureAtlas = texture;
        this.textureLoaded = true;
        console.log('Texture atlas loaded');
        
        // Rebuild existing meshes with textures if game already started
        if (this.isPlaying) {
          this.rebuildAllChunkMeshes();
        }
      },
      undefined,
      (error) => {
        console.warn('Failed to load texture atlas, using colors only:', error);
        this.textureLoaded = false;
      }
    );
  }
  
  rebuildAllChunkMeshes() {
    this.chunkMeshes.forEach((group, key) => {
      const [cx, cz] = key.split(',').map(Number);
      this.queueMeshBuild(cx, cz);
    });
  }
}
