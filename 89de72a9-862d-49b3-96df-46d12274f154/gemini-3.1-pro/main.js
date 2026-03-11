// Wild West Redemption - Single Player Adaptation
// Using THREE from global scope (loaded via CDN)
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/PointerLockControls.js';

let scene, camera, renderer, controls;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// Game state
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playShootSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function playHitSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}
let isPlaying = false;
let playerHealth = 100;
let score = 0;
let wave = 1;
let ammo = 6;
let maxAmmo = 6;
let isReloading = false;
let enemiesKilledInWave = 0;
let enemiesToKill = 5;

// Load high score from local storage
const hsKey = location.pathname + "highScore";
let highScore = localStorage.getItem(hsKey) ? parseInt(localStorage.getItem(hsKey)) : 0;

let enemies = [];
let bullets = [];
let obstacles = [];
let gunGroup;

function createGun() {
  gunGroup = new THREE.Group();
  
  // Barrel
  const barrelGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.6, 8);
  const barrelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, -0.3);
  gunGroup.add(barrel);
  
  // Handle
  const handleGeo = new THREE.BoxGeometry(0.08, 0.2, 0.08);
  const handleMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.set(0, -0.1, 0);
  handle.rotation.x = Math.PI / 4;
  gunGroup.add(handle);
  
  // Position gun relative to camera
  gunGroup.position.set(0.3, -0.2, -0.5);
  camera.add(gunGroup);
  scene.add(camera);
}

// DOM Elements
const menuEl = document.getElementById('menu');
const gameOverEl = document.getElementById('game-over');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const healthDisplay = document.getElementById('health-display');
const scoreDisplay = document.getElementById('score-display');
const highScoreDisplay = document.getElementById('high-score-display');
const waveDisplay = document.getElementById('wave-display');
const ammoDisplay = document.getElementById('ammo-display');
const damageOverlay = document.getElementById('damage-overlay');
const muzzleFlash = document.getElementById('muzzle-flash');
const finalScore = document.getElementById('final-score');
const finalHighScore = document.getElementById('final-high-score');

// Inputs
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

// Config
const PLAYER_SPEED = 60.0;
const GRAVITY = 150.0;
const ENEMY_SPEED = 15.0;
const MAP_SIZE = 200;

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // Sky blue
  scene.fog = new THREE.Fog(0x87CEEB, 20, 150);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.y = 2; // Player height

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.getElementById('game-container').appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(100, 100, 50);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 100;
  dirLight.shadow.camera.bottom = -100;
  dirLight.shadow.camera.left = -100;
  dirLight.shadow.camera.right = 100;
  scene.add(dirLight);

  // Controls
  controls = new PointerLockControls(camera, document.body);

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', resetGame);

  scene.add(controls.getObject());
  
  // Add Gun
  createGun();

  // Input listeners
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousedown', onMouseDown);

  // Environment
  createEnvironment();

  // Resize handler
  window.addEventListener('resize', onWindowResize);
  
  highScoreDisplay.innerText = highScore;

  animate();
}

function startGame() {
  menuEl.style.display = 'none';
  controls.lock();
}

controls.addEventListener('lock', () => {
  if (playerHealth > 0) isPlaying = true;
});

controls.addEventListener('unlock', () => {
  isPlaying = false;
  if (playerHealth > 0) menuEl.style.display = 'flex';
});

function onKeyDown(event) {
  if (!isPlaying) return;
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = true;
      break;
    case 'Space':
      if (canJump === true) {
        velocity.y += 60;
        canJump = false;
      }
      break;
    case 'KeyR':
      reload();
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = false;
      break;
  }
}

function onMouseDown(event) {
  if (!isPlaying || isReloading) return;
  if (event.button === 0) { // Left click
    shoot();
  }
}

function createEnvironment() {
  // Ground
  const floorGeometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, 32, 32);
  const floorMaterial = new THREE.MeshLambertMaterial({ color: 0xc2b280 }); // Desert sand
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Scenery (Boxes and Cacti)
  const boxGeo = new THREE.BoxGeometry(2, 2, 2);
  const boxMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });

  const cactusGeo = new THREE.CylinderGeometry(0.5, 0.5, 4, 8);
  const cactusMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });

  for (let i = 0; i < 40; i++) {
    const isCactus = Math.random() > 0.5;
    const mesh = new THREE.Mesh(isCactus ? cactusGeo : boxGeo, isCactus ? cactusMat : boxMat);
    
    // Random position
    mesh.position.x = (Math.random() - 0.5) * MAP_SIZE * 0.8;
    mesh.position.z = (Math.random() - 0.5) * MAP_SIZE * 0.8;
    mesh.position.y = isCactus ? 2 : 1;
    
    // Don't spawn too close to center
    if (Math.abs(mesh.position.x) < 10 && Math.abs(mesh.position.z) < 10) continue;

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    
    // Collision box
    const box = new THREE.Box3().setFromObject(mesh);
    obstacles.push(box);
  }
  
  // Invisible map boundaries
  const borderGeo = new THREE.BoxGeometry(MAP_SIZE, 20, 1);
  const borderMat = new THREE.MeshBasicMaterial({ visible: false });
  
  const borders = [
    { x: 0, z: -MAP_SIZE/2, rotY: 0 },
    { x: 0, z: MAP_SIZE/2, rotY: 0 },
    { x: -MAP_SIZE/2, z: 0, rotY: Math.PI/2 },
    { x: MAP_SIZE/2, z: 0, rotY: Math.PI/2 }
  ];
  
  borders.forEach(b => {
    const mesh = new THREE.Mesh(borderGeo, borderMat);
    mesh.position.set(b.x, 10, b.z);
    mesh.rotation.y = b.rotY;
    scene.add(mesh);
    obstacles.push(new THREE.Box3().setFromObject(mesh));
  });
}

function spawnEnemy() {
  const enemyGroup = new THREE.Group();
  
  // Body (Red cylinder to represent outlaws)
  const bodyGeo = new THREE.CylinderGeometry(0.8, 0.8, 2.5, 16);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xff3333 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.25;
  body.castShadow = true;
  enemyGroup.add(body);
  
  // Head
  const headGeo = new THREE.SphereGeometry(0.6, 16, 16);
  const headMat = new THREE.MeshLambertMaterial({ color: 0xffccaa });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 3.0;
  enemyGroup.add(head);
  
  // Hat
  const hatGeo = new THREE.CylinderGeometry(1.2, 0.8, 0.4, 16);
  const hatMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const hat = new THREE.Mesh(hatGeo, hatMat);
  hat.position.y = 3.5;
  enemyGroup.add(hat);

  // Spawn position
  const angle = Math.random() * Math.PI * 2;
  const radius = 60 + Math.random() * 30;
  enemyGroup.position.x = controls.getObject().position.x + Math.cos(angle) * radius;
  enemyGroup.position.z = controls.getObject().position.z + Math.sin(angle) * radius;
  
  // Health
  enemyGroup.userData = { health: 100, active: true };
  
  scene.add(enemyGroup);
  enemies.push(enemyGroup);
}

function manageWaves() {
  if (enemiesKilledInWave >= enemiesToKill) {
    wave++;
    waveDisplay.innerText = wave;
    enemiesKilledInWave = 0;
    enemiesToKill = wave * 3 + 2;
    // Heal player slightly
    playerHealth = Math.min(100, playerHealth + 20);
    updateHUD();
  }
  
  // Count active enemies
  const activeEnemies = enemies.filter(e => e.userData.active).length;
  
  // Max concurrent enemies increases with wave
  const maxConcurrent = Math.min(15, wave * 2 + 1);
  
  if (activeEnemies < maxConcurrent && Math.random() < 0.02) {
    spawnEnemy();
  }
}

function shoot() {
  if (ammo <= 0) {
    reload();
    return;
  }
  
  ammo--;
  updateHUD();
  playShootSound();
  
  // Muzzle flash effect
  muzzleFlash.style.opacity = 1;
  setTimeout(() => { muzzleFlash.style.opacity = 0; }, 50);
  
  // Gun recoil (visual on gun instead of camera)
  gunGroup.rotation.x = 0.5;
  gunGroup.position.z = -0.3;
  
  // Raycast
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  
  // Check enemy hits
  let hit = false;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (!enemy.userData.active) continue;
    
    // Check intersection with children
    const intersects = raycaster.intersectObjects(enemy.children);
    if (intersects.length > 0) {
      hit = true;
      playHitSound();
      damageEnemy(enemy, 50); // 2 shots to kill
      createHitMarker(intersects[0].point);
      break; // Only hit one enemy
    }
  }
}

function reload() {
  if (isReloading || ammo === maxAmmo) return;
  isReloading = true;
  ammoDisplay.innerText = `Reloading...`;
  
  setTimeout(() => {
    ammo = maxAmmo;
    isReloading = false;
    updateHUD();
  }, 1000); // 1 second reload
}

function damageEnemy(enemy, amount) {
  enemy.userData.health -= amount;
  if (enemy.userData.health <= 0) {
    enemy.userData.active = false;
    scene.remove(enemy);
    score += 100;
    enemiesKilledInWave++;
    updateHUD();
  } else {
    // Flash red
    enemy.children[0].material.color.setHex(0xffffff);
    setTimeout(() => {
      if(enemy.children[0]) enemy.children[0].material.color.setHex(0xff3333);
    }, 100);
  }
}

function createHitMarker(position) {
  const marker = document.createElement('div');
  marker.className = 'hit-marker';
  marker.innerText = 'X';
  
  // Project 3d position to 2d screen
  const vector = position.clone();
  vector.project(camera);
  
  const x = (vector.x * .5 + .5) * window.innerWidth;
  const y = (vector.y * -.5 + .5) * window.innerHeight;
  
  marker.style.left = `${x}px`;
  marker.style.top = `${y}px`;
  
  document.body.appendChild(marker);
  
  setTimeout(() => {
    marker.remove();
  }, 1000);
}

function takeDamage(amount) {
  playerHealth -= amount;
  updateHUD();
  
  // Damage overlay
  damageOverlay.style.opacity = 1;
  setTimeout(() => { damageOverlay.style.opacity = 0; }, 200);
  
  // Camera shake effect
  cameraShakeTime = 0.2;
  
  if (playerHealth <= 0) {
    die();
  }
}

function die() {
  isPlaying = false;
  controls.unlock();
  gameOverEl.style.display = 'flex';
  
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(hsKey, highScore);
  }
  
  finalScore.innerText = score;
  finalHighScore.innerText = highScore;
}

function updateHUD() {
  healthDisplay.innerText = Math.max(0, Math.floor(playerHealth));
  scoreDisplay.innerText = score;
  highScoreDisplay.innerText = Math.max(score, highScore);
  if (!isReloading) ammoDisplay.innerText = `${ammo}/${maxAmmo}`;
}

function resetGame() {
  playerHealth = 100;
  score = 0;
  wave = 1;
  ammo = maxAmmo;
  isReloading = false;
  enemiesKilledInWave = 0;
  enemiesToKill = 5;
  
  // Clear enemies
  enemies.forEach(e => scene.remove(e));
  enemies = [];
  
  // Reset player position
  controls.getObject().position.set(0, 2, 0);
  velocity.set(0,0,0);
  
  gameOverEl.style.display = 'none';
  updateHUD();
  controls.lock();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateEnemies(delta) {
  const playerPos = controls.getObject().position;
  
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (!enemy.userData.active) continue;
    
    // Look at player (ignoring Y)
    const target = new THREE.Vector3(playerPos.x, enemy.position.y, playerPos.z);
    enemy.lookAt(target);
    
    // Move towards player
    const dist = enemy.position.distanceTo(playerPos);
    
    if (dist > 2.5) {
      // Move
      const moveDir = new THREE.Vector3().subVectors(target, enemy.position).normalize();
      
      // Speed up slightly as waves progress
      const currentSpeed = ENEMY_SPEED + (wave * 0.5);
      
      enemy.position.add(moveDir.multiplyScalar(currentSpeed * delta));
      
      // Simple bobbing animation
      enemy.position.y = Math.sin(performance.now() * 0.01) * 0.2;
    } else {
      // Attack player
      if (Math.random() < 0.05) { // Attack rate
        takeDamage(10);
      }
    }
  }
}

function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  if (isPlaying) {
    // Player physics and movement
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= GRAVITY * delta; // 100.0 = mass

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * PLAYER_SPEED * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * PLAYER_SPEED * delta;

    // Movement collision prediction
    const controlObj = controls.getObject();
    const oldPosition = controlObj.position.clone();
    
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    
    // Simple collision with bounding boxes
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      controlObj.position,
      new THREE.Vector3(1, 2, 1) // Player size
    );
    
    let collided = false;
    for (let i = 0; i < obstacles.length; i++) {
      if (playerBox.intersectsBox(obstacles[i])) {
        collided = true;
        break;
      }
    }
    
    if (collided) {
      controlObj.position.copy(oldPosition);
      velocity.x = 0;
      velocity.z = 0;
    }

    controlObj.position.y += (velocity.y * delta);

    if (controlObj.position.y < 2) {
      velocity.y = 0;
      controlObj.position.y = 2;
      canJump = true;
    }

    manageWaves();
    updateEnemies(delta);
    
    // Gradual recoil recovery for gun
    if (gunGroup) {
      gunGroup.rotation.x = THREE.MathUtils.lerp(gunGroup.rotation.x, 0, 0.1);
      gunGroup.position.z = THREE.MathUtils.lerp(gunGroup.position.z, -0.5, 0.1);
      
      // Add slight bobbing when walking
      if (moveForward || moveBackward || moveLeft || moveRight) {
        gunGroup.position.y = -0.2 + Math.sin(time * 0.01) * 0.02;
      } else {
        gunGroup.position.y = THREE.MathUtils.lerp(gunGroup.position.y, -0.2, 0.1);
      }
    }
  }

  prevTime = time;
  renderer.render(scene, camera);
}

// Start
init();
