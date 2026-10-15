// =============================================================================
// effects.js — spark bursts when you hit notes.
//
// All sparks live in ONE "Points" object (one draw call, cheap on phones).
// Each spark has a position, velocity, color and lifetime; every frame we move
// them a little and fade them out. Dead sparks get reused by the next burst.
// =============================================================================
import * as THREE from 'three';
import { LANES } from '../config.js';
import { laneX } from './highway.js';

const MAX = 400;

export function createEffects(scene) {
  const positions = new Float32Array(MAX * 3);
  const colors = new Float32Array(MAX * 3);
  const vel = new Float32Array(MAX * 3);
  const life = new Float32Array(MAX); // seconds left (0 = dead)
  const base = new Float32Array(MAX * 3); // original color, for fading
  let next = 0;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.22, map: softDot(), vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  points.frustumCulled = false;
  scene.add(points);

  const laneColors = LANES.map((l) => new THREE.Color(l.color));
  const white = new THREE.Color('#fff4d6');

  /** Throw `count` sparks out of the hit line at a lane. */
  function burst(lane, count) {
    const c = laneColors[lane];
    for (let k = 0; k < count; k++) {
      const i = next;
      next = (next + 1) % MAX;
      const a = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      positions.set([laneX(lane) + (Math.random() - 0.5) * 0.4, 0.15, 0], i * 3);
      vel.set([Math.cos(a) * speed * 0.6, 2.5 + Math.random() * 3.5, Math.sin(a) * speed * 0.4], i * 3);
      const col = k % 4 === 0 ? white : c;
      base.set([col.r, col.g, col.b], i * 3);
      life[i] = 0.4 + Math.random() * 0.35;
    }
  }

  function update(dt) {
    for (let i = 0; i < MAX; i++) {
      if (life[i] <= 0) { colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 0; continue; }
      life[i] -= dt;
      vel[i * 3 + 1] -= 9 * dt; // gravity
      positions[i * 3] += vel[i * 3] * dt;
      positions[i * 3 + 1] += vel[i * 3 + 1] * dt;
      positions[i * 3 + 2] += vel[i * 3 + 2] * dt;
      const fade = Math.max(0, Math.min(1, life[i] / 0.3));
      colors[i * 3] = base[i * 3] * fade;
      colors[i * 3 + 1] = base[i * 3 + 1] * fade;
      colors[i * 3 + 2] = base[i * 3 + 2] * fade;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  function clear() { life.fill(0); }

  return { burst, update, clear };
}

/** A small round, soft-edged dot texture drawn on a canvas. */
function softDot() {
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
