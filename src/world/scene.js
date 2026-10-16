// =============================================================================
// scene.js — sets up Three.js: the renderer, the camera and the "scene"
// (the container that holds every 3D object).
//
// THREE.JS IN ONE PARAGRAPH: you build a Scene out of Meshes. A Mesh is a
// Geometry (the shape: box, plane, cylinder...) plus a Material (how it looks:
// color, texture, glow). A Camera looks at the scene, and every frame the
// Renderer draws what the camera sees onto the <canvas>.
// =============================================================================
import * as THREE from 'three';
import { CAMERA } from '../config.js';

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // cap for phone battery
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b0b18');
  // Fog fades far-away things into the background color = sense of depth.
  scene.fog = new THREE.Fog('#0b0b18', 24, 58);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 120);
  // Developer tool: add ?view=stage to the page address for a close-up of the
  // band (handy for checking animation). Normal players never see this.
  const closeUp = new URLSearchParams(location.search).get('view') === 'stage';
  camera.position.set(...(closeUp ? [0, 4.4, -3.5] : CAMERA.position));
  const lookTarget = new THREE.Vector3(...(closeUp ? [0, 3.4, -19] : CAMERA.lookAt));
  camera.lookAt(lookTarget);

  // Soft base lighting so nothing is pitch black.
  scene.add(new THREE.HemisphereLight('#8a8cff', '#1a0f24', 1.1));
  // A light from behind the camera makes the note gems look shiny and 3D.
  const key = new THREE.DirectionalLight('#fff1d6', 1.6);
  key.position.set(1, 6, 6);
  scene.add(key);

  /** Fit the canvas to its container; widen the view on narrow screens. */
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const fov = 2 * Math.atan(CAMERA.horizontalHalfTan / camera.aspect) * (180 / Math.PI);
    camera.fov = Math.min(CAMERA.maxFov, Math.max(CAMERA.minFov, fov));
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  // A tiny camera "kick" on big moments. Kept small so notes stay readable.
  let shake = 0;
  const basePos = camera.position.clone();
  function kick(amount) { shake = Math.max(shake, amount); }
  function updateCamera(dt, time) {
    shake = Math.max(0, shake - dt * 3);
    camera.position.set(
      basePos.x + Math.sin(time * 61) * shake * 0.05,
      basePos.y + Math.sin(time * 47) * shake * 0.04,
      basePos.z,
    );
    camera.lookAt(lookTarget);
  }

  /** Used by perf.js to trade a little sharpness for smoothness on slow phones. */
  function setPixelRatio(r) {
    renderer.setPixelRatio(r);
    resize();
  }

  return { renderer, scene, camera, resize, kick, updateCamera, setPixelRatio };
}
