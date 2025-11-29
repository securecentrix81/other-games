// game.js

import * as THREE from 'three';
import { Player } from './player.js';
import { NPC } from './npc.js';
import { updateHUD } from './ui.js';
import { toggleSecureCentrix } from './secureCentrix.js';
import { preventScrollingKeys } from './utils.js';

let scene, renderer, camera, player, deltaTime;
let input = { keys: {} };
let npcs = [];
let gameClock = 480; // 8:00 AM
let lastTime = 0;

const canvas = document.getElementById("game-canvas");

function init() {
  renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x111111);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 10);

  const alight = new THREE.AmbientLight(0xffffff, 0.6);
  const dlight = new THREE.DirectionalLight(0xffffff, 0.8);
  dlight.position.set(5, 10, 7);
  scene.add(alight, dlight);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  player = new Player(scene);

  for (let i = 0; i < 5; i++) {
    npcs.push(new NPC(['classmate', 'bully', 'teacher'][i % 3], scene));
  }

  window.addEventListener('keydown', e => input.keys[e.code] = true);
  window.addEventListener('keyup', e => input.keys[e.code] = false);
  preventScrollingKeys();

  document.getElementById('start-game').onclick = () => {
    document.getElementById('main-menu').style.display = 'none';
    loop();
  };
  document.getElementById('how-to-play').onclick = () => {
    document.getElementById('instructions-overlay').style.display = 'block';
  };
  document.getElementById('close-instructions').onclick = () => {
    document.getElementById('instructions-overlay').style.display = 'none';
  };
  window.addEventListener('exitSecureCentrix', () => toggleSecureCentrix(false));
}

function loop(now = 0) {
  deltaTime = (now - lastTime) / 1000;
  lastTime = now;

  gameClock += deltaTime * 10;
  player.update(deltaTime, input);
  for (let npc of npcs) npc.update(deltaTime);

  updateHUD(player, Math.floor(gameClock));

  camera.position.x = player.position.x;
  camera.position.z = player.position.z + 10;
  camera.lookAt(player.position);

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

init();
