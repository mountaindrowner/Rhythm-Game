// =============================================================================
// effects.js — particles: sparks when you hit notes (and the building block
// for pyro and confetti in showfx.js).
//
// All particles of one kind live in ONE "Points" object (one draw call, cheap
// on phones). Each particle has a position, velocity, color and lifetime;
// every frame we move them a little and fade them out. Dead particles get
// reused by the next burst.
// =============================================================================
import * as THREE from 'three';
import { LANES } from '../config.js';
import { laneX } from './highway.js';

export class Particles {
  /**
   * @param {THREE.Scene} scene
   * @param {{max?:number, size?:number, additive?:boolean, gravity?:number, drag?:number, square?:boolean}} opts
   */
  constructor(scene, { max = 400, size = 0.22, additive = true, gravity = 9, drag = 0, square = false } = {}) {
    this.max = max;
    this.gravity = gravity;
    this.drag = drag;
    // Glowing (additive) particles fade to black = invisible. Solid ones like
    // confetti would turn into black squares, so they keep their color and are
    // moved out of sight when they die instead.
    this.fade = additive;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.base = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.next = 0;
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(this.geo, new THREE.PointsMaterial({
      size, map: square ? null : softDot(), vertexColors: true, transparent: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  emit(x, y, z, vx, vy, vz, color, life) {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.base.set([color.r, color.g, color.b], i * 3);
    this.life[i] = this.maxLife[i] = life;
  }

  update(dt) {
    const { pos, vel, col, base, life } = this;
    const damp = Math.exp(-this.drag * dt);
    for (let i = 0; i < this.max; i++) {
      const j = i * 3;
      if (life[i] <= 0) {
        col[j] = col[j + 1] = col[j + 2] = 0;
        pos[j + 1] = -1000;
        continue;
      }
      life[i] -= dt;
      vel[j] *= damp;
      vel[j + 1] = vel[j + 1] * damp - this.gravity * dt;
      vel[j + 2] *= damp;
      pos[j] += vel[j] * dt;
      pos[j + 1] += vel[j + 1] * dt;
      pos[j + 2] += vel[j + 2] * dt;
      const fade = this.fade ? Math.max(0, Math.min(1, life[i] / 0.3)) : 1;
      col[j] = base[j] * fade;
      col[j + 1] = base[j + 1] * fade;
      col[j + 2] = base[j + 2] * fade;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }

  clear() { this.life.fill(0); }
}

/** Note-hit sparks at the hit line. */
export function createEffects(scene) {
  const sparks = new Particles(scene, { max: 400, size: 0.22 });
  const laneColors = LANES.map((l) => new THREE.Color(l.color));
  const white = new THREE.Color('#fff4d6');

  /** Throw `count` sparks out of the hit line at a lane. */
  function burst(lane, count) {
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      sparks.emit(
        laneX(lane) + (Math.random() - 0.5) * 0.4, 0.15, 0,
        Math.cos(a) * speed * 0.6, 2.5 + Math.random() * 3.5, Math.sin(a) * speed * 0.4,
        k % 4 === 0 ? white : laneColors[lane], 0.4 + Math.random() * 0.35,
      );
    }
  }

  return { burst, update: (dt) => sparks.update(dt), clear: () => sparks.clear() };
}

/** A small round, soft-edged dot texture drawn on a canvas. */
export function softDot() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
