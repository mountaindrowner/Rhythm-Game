// =============================================================================
// riotSign.js — the giant "RIOT MODE!" sign that floats in front of the stage,
// just under the band, while Riot Mode is on.
//
// It's a flat plane in the 3D world showing a small canvas we draw ourselves:
// chunky gold letters with a glow, crackling with TV-style STATIC (random
// bright specks inside the letters, and now and then a "glitch" where a slice
// of the sign jumps sideways). The canvas is redrawn about 15 times a second
// so the static keeps moving.
//
//   show()  slam in (it starts big and lands)      hide()  squash and fade out
//   update(time, dt)  float, flicker and crackle (call every frame)
// =============================================================================
import * as THREE from 'three';
import { WORLD } from '../config.js';

const W = 320;   // canvas size in pixels (small on purpose: chunky pixel look)
const H = 72;
const TEXT = 'RIOT MODE!';

export function createRiotSign(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;

  // The letters are drawn once into their own canvas; each redraw copies
  // them (with static and glitches) onto the visible canvas.
  const letters = document.createElement('canvas');
  letters.width = W;
  letters.height = H;
  const lg = letters.getContext('2d');
  lg.font = 'bold 50px monospace';
  lg.textAlign = 'center';
  lg.textBaseline = 'middle';
  const grad = lg.createLinearGradient(0, 12, 0, 60);
  grad.addColorStop(0, '#fff6c8');
  grad.addColorStop(0.45, '#ffc83a');
  grad.addColorStop(1, '#ff5a2a');
  lg.shadowColor = '#ff9b3b';
  lg.shadowBlur = 16;           // the glow around the letters
  lg.lineWidth = 5;
  lg.strokeStyle = '#3a0d1e';   // dark outline so it reads over anything
  lg.strokeText(TEXT, W / 2, H / 2 + 2);
  lg.fillStyle = grad;
  lg.fillText(TEXT, W / 2, H / 2 + 2);

  // Big: about as wide as the band's front line. It's drawn on top of the
  // crowd (depthTest off), so fans' heads never hide it.
  const width = 8.6;
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false, depthTest: false, fog: false, opacity: 0,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, (width * H) / W), mat);
  const base = new THREE.Vector3(0, WORLD.stageHeight + 0.05, WORLD.stageZ + 0.9);
  mesh.position.copy(base);
  mesh.visible = false;
  mesh.renderOrder = 10; // after everything else
  scene.add(mesh);

  // A big soft orange GLOW behind the letters, so the sign lights up the
  // stage around it and you can't miss that Riot Mode is on.
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 64;
  glowCanvas.height = 64;
  const gg = glowCanvas.getContext('2d');
  const grd = gg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,190,80,0.9)');
  grd.addColorStop(0.45, 'rgba(255,110,40,0.45)');
  grd.addColorStop(1, 'rgba(255,60,40,0)');
  gg.fillStyle = grd;
  gg.fillRect(0, 0, 64, 64);
  const glowMat = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending, fog: false, opacity: 0,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.35, width * 0.62), glowMat);
  glow.renderOrder = 9; // just behind the letters
  glow.visible = false;
  scene.add(glow);

  let on = false;
  let shownAt = -1;   // time it was shown (or -2 = on the next update)
  let lastDraw = -1;

  function draw(time) {
    g.clearRect(0, 0, W, H);
    // Usually draw the letters straight; sometimes glitch: slices jump sideways.
    const glitch = Math.random() < 0.18;
    if (glitch) {
      for (let y = 0; y < H; y += 8) {
        const shift = Math.random() < 0.4 ? (Math.random() - 0.5) * 24 : 0;
        g.drawImage(letters, 0, y, W, 8, shift, y, W, 8);
      }
    } else {
      g.drawImage(letters, 0, 0);
    }
    // Static: bright specks only where the letters are ("source-atop").
    g.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 160; i++) {
      g.fillStyle = Math.random() < 0.6 ? 'rgba(255,255,255,0.85)' : 'rgba(120,220,255,0.8)';
      g.fillRect((Math.random() * W) | 0, (Math.random() * H) | 0, 2, 1);
    }
    // A scanline band sweeping down through the letters.
    const band = ((time * 90) % (H + 20)) - 10;
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(0, band, W, 3);
    g.globalCompositeOperation = 'source-over';
    tex.needsUpdate = true;
  }

  return {
    show() {
      if (on) return;
      on = true;
      shownAt = -2;
    },
    hide() { on = false; },
    clear() {
      on = false;
      mesh.visible = false;
      mat.opacity = 0;
      glow.visible = false;
    },

    update(time, dt) {
      if (shownAt === -2) shownAt = time;
      // Fade in quickly, fade out a little slower.
      mat.opacity += ((on ? 1 : 0) - mat.opacity) * (1 - Math.exp(-dt * (on ? 14 : 5)));
      mesh.visible = mat.opacity > 0.02;
      glow.visible = mesh.visible;
      if (!mesh.visible) return;
      const since = time - shownAt;
      // Slam in: starts at 2.4× size and lands in a quarter second, with a bounce.
      let s = 1;
      if (on && since < 0.35) {
        const k = since / 0.35;
        s = 1 + 1.4 * (1 - k) * (1 - k) - Math.sin(k * Math.PI) * 0.12;
      }
      if (!on) s = 0.6 + 0.4 * mat.opacity; // squash away when it ends
      mesh.scale.set(s, on ? s : s * mat.opacity, 1);
      // Float: a gentle bob and sway.
      mesh.position.set(base.x + Math.sin(time * 1.3) * 0.15, base.y + Math.sin(time * 2.6) * 0.12, base.z);
      mesh.rotation.z = Math.sin(time * 1.7) * 0.02;
      // The glow follows the sign and breathes.
      glow.position.copy(mesh.position);
      glow.position.z -= 0.05;
      glow.scale.copy(mesh.scale);
      glowMat.opacity = mat.opacity * (0.6 + 0.25 * Math.sin(time * 7));
      // Flicker like a sign with a loose wire, and crackle ~15 times a second.
      if (on) mat.opacity *= Math.random() < 0.06 ? 0.55 : 1;
      if (time - lastDraw > 0.09) {
        lastDraw = time;
        draw(time);
      }
    },
  };
}
