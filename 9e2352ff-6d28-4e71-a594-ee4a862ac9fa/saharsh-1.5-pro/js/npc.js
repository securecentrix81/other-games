// npc.js
import * as THREE from 'three';

export class NPC {
  constructor(type, scene) {
    this.type = type;
    this.speed = 1.5 + Math.random();
    this.position = new THREE.Vector3(
      Math.random() * 40 - 20,
      0,
      Math.random() * 40 - 20
    );

    const colorMap = {
      classmate: 0xffffff,
      bully: 0xd62828,
      teacher: 0x0077b6
    };

    const geo = new THREE.BoxGeometry(1, 1.5, 1);
    const mat = new THREE.MeshStandardMaterial({ color: colorMap[type] || 0x888888 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);

    this.direction = new THREE.Vector3(Math.random(), 0, Math.random()).normalize();
  }

  update(dt) {
    this.position.addScaledVector(this.direction, this.speed * dt);
    if (Math.abs(this.position.x) > 20) this.direction.x *= -1;
    if (Math.abs(this.position.z) > 20) this.direction.z *= -1;
    this.mesh.position.copy(this.position);
  }
}
