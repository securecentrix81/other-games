const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const hud = document.getElementById("hud");
const menu = document.getElementById("menu");
const pauseScreen = document.getElementById("pause");
const endScreen = document.getElementById("end");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const eventBanner = document.getElementById("eventBanner");

const labels = {
  mission: document.getElementById("missionLabel"),
  time: document.getElementById("timeLabel"),
  target: document.getElementById("targetLabel"),
  score: document.getElementById("scoreLabel"),
  high: document.getElementById("highLabel"),
  combo: document.getElementById("comboLabel"),
  health: document.getElementById("healthLabel"),
  ammo: document.getElementById("ammoLabel"),
  view: document.getElementById("viewLabel"),
  endTitle: document.getElementById("endTitle"),
  endText: document.getElementById("endText"),
};

const STORAGE_PREFIX = `${location.pathname}::secureCentrix81::`;
const HIGH_SCORE_KEY = `${STORAGE_PREFIX}highScore`;

const missions = [
  { name: "Dust Pass", duration: 45, killsNeeded: 18, spawnRate: 1.0, eliteChance: 0.12 },
  { name: "Rail Town", duration: 55, killsNeeded: 28, spawnRate: 1.35, eliteChance: 0.2 },
  { name: "Fort Siege", duration: 65, killsNeeded: 40, spawnRate: 1.75, eliteChance: 0.3 },
];

const enemyTypes = {
  bandit: { hp: 1, speed: 13, reward: 100, color: "#32150f", shootRate: 2.3 },
  rider: { hp: 2, speed: 17, reward: 180, color: "#5b2e1b", shootRate: 1.7 },
  sharpshooter: { hp: 1, speed: 9, reward: 250, color: "#22272f", shootRate: 1.1 },
};

const state = {
  mode: "menu",
  view: "fps",
  score: 0,
  highScore: Number(localStorage.getItem(HIGH_SCORE_KEY) || 0),
  health: 100,
  ammo: 6,
  maxAmmo: 6,
  reloading: false,
  missionIndex: 0,
  missionTime: missions[0].duration,
  kills: 0,
  combo: 1,
  comboTimer: 0,
  deadeyeTime: 0,
  playerX: 0,
  crossX: 0,
  crossY: 0,
  shake: 0,
  enemies: [],
  particles: [],
  popups: [],
  bullets: [],
  spawnTimer: 0,
};

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  state.crossX = canvas.width / 2;
  state.crossY = canvas.height / 2;
}

window.addEventListener("resize", resize);
resize();

function resetRun() {
  state.mode = "playing";
  state.score = 0;
  state.health = 100;
  state.ammo = state.maxAmmo;
  state.reloading = false;
  state.missionIndex = 0;
  state.missionTime = missions[0].duration;
  state.kills = 0;
  state.combo = 1;
  state.comboTimer = 0;
  state.deadeyeTime = 0;
  state.playerX = 0;
  state.enemies.length = 0;
  state.particles.length = 0;
  state.popups.length = 0;
  state.bullets.length = 0;
  state.spawnTimer = 0.7;
  state.shake = 0;
  showBanner(`Mission 1: ${missions[0].name}`);
  menu.classList.add("hidden");
  endScreen.classList.add("hidden");
  pauseScreen.classList.add("hidden");
  hud.classList.remove("hidden");
}

function project(enemy) {
  const perspective = 420 / enemy.z;
  const x = canvas.width / 2 + (enemy.x - state.playerX) * perspective;
  const y = canvas.height * 0.62 - enemy.height * perspective;
  const size = Math.max(16, 42 * perspective);
  return { x, y, size };
}

function spawnEnemy() {
  const mission = missions[state.missionIndex];
  const roll = Math.random();
  let kind = "bandit";
  if (roll < mission.eliteChance * 0.45) kind = "sharpshooter";
  else if (roll < mission.eliteChance) kind = "rider";
  const def = enemyTypes[kind];

  state.enemies.push({
    kind,
    x: (Math.random() - 0.5) * 90,
    z: 110 + Math.random() * 25,
    hp: def.hp,
    height: 26 + Math.random() * 8,
    shootTimer: 0.5 + Math.random() * def.shootRate,
  });
}

function shoot() {
  if (state.mode !== "playing" || state.reloading) return;
  if (state.ammo <= 0) {
    reload();
    return;
  }
  state.ammo -= 1;
  state.shake = Math.min(8, state.shake + 3);

  let best = null;
  let bestDist = 45;

  for (const enemy of state.enemies) {
    const p = project(enemy);
    const dist = Math.hypot(state.crossX - p.x, state.crossY - p.y);
    const aimAssist = p.size * 0.65;
    if (dist < aimAssist && dist < bestDist) {
      best = enemy;
      bestDist = dist;
    }
  }

  state.bullets.push({
    x1: canvas.width / 2,
    y1: canvas.height * 0.78,
    x2: state.crossX,
    y2: state.crossY,
    life: 0.08,
  });

  if (!best) return;
  best.hp -= 1;
  for (let i = 0; i < 8; i += 1) {
    state.particles.push({
      x: state.crossX,
      y: state.crossY,
      vx: (Math.random() - 0.5) * 180,
      vy: (Math.random() - 0.5) * 180,
      life: 0.35 + Math.random() * 0.3,
      color: "#f0d4a0",
    });
  }

  if (best.hp <= 0) {
    const def = enemyTypes[best.kind];
    const longShotBonus = best.z > 75 ? 120 : 0;
    const clutchBonus = best.z < 14 ? 140 : 0;
    const deadeyeBonus = state.deadeyeTime > 0 ? 60 : 0;
    const earned = Math.round((def.reward + longShotBonus + clutchBonus + deadeyeBonus) * state.combo);
    state.score += earned;
    state.kills += 1;
    state.combo = Math.min(8, state.combo + 0.3);
    state.comboTimer = 2.6;
    popup(best, `+${earned}`);
    state.enemies.splice(state.enemies.indexOf(best), 1);
  }

  if (state.ammo <= 0) reload();
}

function popup(enemy, text) {
  const p = project(enemy);
  state.popups.push({ x: p.x, y: p.y, text, life: 0.65 });
}

function reload() {
  if (state.reloading || state.ammo === state.maxAmmo) return;
  state.reloading = true;
  setTimeout(() => {
    state.ammo = state.maxAmmo;
    state.reloading = false;
  }, 950);
}

function showBanner(text) {
  eventBanner.textContent = text;
  eventBanner.style.opacity = "1";
  setTimeout(() => {
    eventBanner.style.opacity = "0";
  }, 1100);
}

function nextMission() {
  if (state.missionIndex === missions.length - 1) {
    finish(true);
    return;
  }
  state.missionIndex += 1;
  state.kills = 0;
  state.missionTime = missions[state.missionIndex].duration;
  state.spawnTimer = 0.8;
  showBanner(`Mission ${state.missionIndex + 1}: ${missions[state.missionIndex].name}`);
}

function finish(victory) {
  state.mode = "ended";
  hud.classList.add("hidden");
  endScreen.classList.remove("hidden");
  labels.endTitle.textContent = victory ? "Victory" : "Outlaw Down";
  labels.endText.textContent = victory
    ? `All missions cleared. Final score: ${state.score}`
    : `You fell with ${state.score} points. One more ride?`;
  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem(HIGH_SCORE_KEY, String(state.highScore));
  }
}

function update(dt) {
  if (state.mode !== "playing") return;

  const mission = missions[state.missionIndex];
  const flowFactor = 1 + state.missionIndex * 0.24 + Math.min(0.5, state.score / 12000);
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnEnemy();
    state.spawnTimer = (0.88 / mission.spawnRate) / flowFactor + Math.random() * 0.35;
  }

  state.deadeyeTime -= dt;
  if (state.deadeyeTime < 0) state.deadeyeTime = 0;
  if (Math.floor(state.missionTime) % 17 === 0 && state.missionTime < mission.duration - 1 && state.deadeyeTime === 0) {
    state.deadeyeTime = 4.5;
    showBanner("Deadeye Rush x1.5");
  }

  state.missionTime -= dt;
  if (state.missionTime <= 0) {
    if (state.kills >= mission.killsNeeded) nextMission();
    else finish(false);
  }

  state.comboTimer -= dt;
  if (state.comboTimer <= 0) state.combo = Math.max(1, state.combo - dt * 1.5);

  for (const enemy of state.enemies) {
    const def = enemyTypes[enemy.kind];
    const speedMod = state.deadeyeTime > 0 ? 0.65 : 1;
    enemy.z -= def.speed * speedMod * dt;
    enemy.shootTimer -= dt;
    if (enemy.shootTimer <= 0 && enemy.z < 65) {
      enemy.shootTimer = def.shootRate * (0.7 + Math.random() * 0.8);
      const hit = Math.random() < Math.max(0.12, 0.45 - enemy.z / 170);
      if (hit) {
        const damage = enemy.kind === "sharpshooter" ? 20 : enemy.kind === "rider" ? 14 : 10;
        state.health -= damage;
        state.combo = 1;
        state.shake = Math.min(10, state.shake + 5);
      }
    }
    if (enemy.z <= 5) {
      state.health -= 18;
      state.combo = 1;
      state.enemies.splice(state.enemies.indexOf(enemy), 1);
    }
  }

  if (state.health <= 0) {
    finish(false);
  }

  for (const b of state.bullets) b.life -= dt;
  state.bullets = state.bullets.filter((b) => b.life > 0);

  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  for (const popup of state.popups) {
    popup.life -= dt;
    popup.y -= dt * 30;
  }
  state.popups = state.popups.filter((p) => p.life > 0);
  state.shake *= 0.88;
}

function drawWorld() {
  const shakeX = (Math.random() - 0.5) * state.shake;
  const shakeY = (Math.random() - 0.5) * state.shake;
  ctx.save();
  ctx.translate(shakeX, shakeY);

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.62);
  sky.addColorStop(0, "#efc17f");
  sky.addColorStop(1, "#845234");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.62);

  const ground = ctx.createLinearGradient(0, canvas.height * 0.62, 0, canvas.height);
  ground.addColorStop(0, "#6e4328");
  ground.addColorStop(1, "#28170e");
  ctx.fillStyle = ground;
  ctx.fillRect(0, canvas.height * 0.62, canvas.width, canvas.height * 0.38);

  for (let i = 0; i < 8; i += 1) {
    const y = canvas.height * 0.62 + i * 34;
    ctx.strokeStyle = `rgba(240, 212, 160, ${0.08 - i * 0.008})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y + i * 2);
    ctx.stroke();
  }

  const sorted = [...state.enemies].sort((a, b) => b.z - a.z);
  for (const enemy of sorted) {
    const p = project(enemy);
    const def = enemyTypes[enemy.kind];
    ctx.fillStyle = def.color;
    ctx.fillRect(p.x - p.size * 0.45, p.y - p.size, p.size * 0.9, p.size * 1.25);
    ctx.fillStyle = "#f0d4a0";
    ctx.fillRect(p.x - p.size * 0.2, p.y - p.size * 1.1, p.size * 0.4, p.size * 0.25);
  }

  for (const bullet of state.bullets) {
    ctx.strokeStyle = `rgba(255, 231, 163, ${Math.min(1, bullet.life * 10)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bullet.x1, bullet.y1);
    ctx.lineTo(bullet.x2, bullet.y2);
    ctx.stroke();
  }

  for (const particle of state.particles) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life * 1.7);
    ctx.fillRect(particle.x, particle.y, 3, 3);
    ctx.globalAlpha = 1;
  }

  for (const popup of state.popups) {
    ctx.fillStyle = `rgba(255, 226, 160, ${popup.life * 1.5})`;
    ctx.font = "700 18px Manrope";
    ctx.fillText(popup.text, popup.x, popup.y);
  }

  if (state.view === "tps") {
    ctx.fillStyle = "rgba(10, 10, 10, 0.85)";
    const baseY = canvas.height * 0.86;
    const px = canvas.width / 2 + state.playerX * 5;
    ctx.fillRect(px - 24, baseY - 58, 48, 58);
    ctx.fillStyle = "#e8cc99";
    ctx.fillRect(px - 11, baseY - 70, 22, 16);
    ctx.fillStyle = "#191512";
    ctx.fillRect(px + 10, baseY - 44, 42, 8);
  } else {
    ctx.fillStyle = "#1d1713";
    ctx.fillRect(canvas.width / 2 - 50, canvas.height - 66, 100, 66);
    ctx.fillStyle = "#b87944";
    ctx.fillRect(canvas.width / 2 + 18, canvas.height - 54, 54, 18);
  }

  drawCrosshair();
  ctx.restore();
}

function drawCrosshair() {
  const x = state.crossX;
  const y = state.crossY;
  ctx.strokeStyle = "rgba(255, 235, 195, 0.92)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 16, y);
  ctx.lineTo(x - 5, y);
  ctx.moveTo(x + 5, y);
  ctx.lineTo(x + 16, y);
  ctx.moveTo(x, y - 16);
  ctx.lineTo(x, y - 5);
  ctx.moveTo(x, y + 5);
  ctx.lineTo(x, y + 16);
  ctx.stroke();
}

function draw() {
  drawWorld();
  labels.mission.textContent = `${state.missionIndex + 1}: ${missions[state.missionIndex].name}`;
  labels.time.textContent = `${Math.max(0, Math.ceil(state.missionTime))}s`;
  labels.target.textContent = `${state.kills}/${missions[state.missionIndex].killsNeeded}`;
  labels.score.textContent = `${state.score}`;
  labels.high.textContent = `${state.highScore}`;
  labels.combo.textContent = `x${state.combo.toFixed(1)}`;
  labels.health.textContent = `${Math.max(0, state.health)}`;
  labels.ammo.textContent = state.reloading ? "Reloading..." : `${state.ammo}/${state.maxAmmo}`;
  labels.view.textContent = state.view.toUpperCase();
}

let previous = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - previous) / 1000);
  previous = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  state.crossX = event.clientX - rect.left;
  state.crossY = event.clientY - rect.top;
  if (state.view === "tps") {
    const normalized = (state.crossX / canvas.width) * 2 - 1;
    state.playerX = Math.max(-20, Math.min(20, normalized * 20));
  }
});

canvas.addEventListener("mousedown", shoot);

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }
  if (event.key.toLowerCase() === "r") reload();
  if (event.key.toLowerCase() === "v") state.view = state.view === "fps" ? "tps" : "fps";
  if (event.key.toLowerCase() === "p") {
    if (state.mode === "playing") {
      state.mode = "paused";
      pauseScreen.classList.remove("hidden");
    } else if (state.mode === "paused") {
      state.mode = "playing";
      pauseScreen.classList.add("hidden");
    }
  }
});

startBtn.addEventListener("click", resetRun);
retryBtn.addEventListener("click", resetRun);

labels.high.textContent = `${state.highScore}`;
