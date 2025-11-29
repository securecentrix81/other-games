// player.js
import * as THREE from 'three';
import { clamp } from './utils.js';

export class Player {
  constructor(scene) {
    this.speed = 5;
    this.health = 100;
    this.energy = 100;
    this.respect = 30;
    this.chaos = 10;

    this.position = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    const geo = new THREE.BoxGeometry(1, 1.5, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x00ccff });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);

    scene.add(this.mesh);
  }

  update(delta, input) {
    const moveSpeed = this.speed * delta;
    let dx = 0, dz = 0;

    if (input.keys['KeyW']) dz -= moveSpeed;
    if (input.keys['KeyS']) dz += moveSpeed;
    if (input.keys['KeyA']) dx -= moveSpeed;
    if (input.keys['KeyD']) dx += moveSpeed;

    this.position.x += dx;
    this.position.z += dz;

    // Clamp to school bounds
    this.position.x = clamp(this.position.x, -20, 20);
    this.position.z = clamp(this.position.z, -20, 20);

    this.mesh.position.copy(this.position);
  }
}
