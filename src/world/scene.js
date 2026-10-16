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
  const baseLook = lookTarget.clone();
  // The SHOW INTRO: the camera starts high up at the back of the crowd,
  // looking at the band, and swoops down to the playing position.
  const introPos = new THREE.Vector3(2.5, 8, 15);
  const introLook = new THREE.Vector3(0, 2.6, -19);
  const pos = new THREE.Vector3();
  function kick(amount) { shake = Math.max(shake, amount); }
  /** intro: 0 = start of the swoop, 1 = normal playing view. */
  function updateCamera(dt, time, intro = 1) {
    shake = Math.max(0, shake - dt * 3);
    // Ease in and out: start gently, glide, settle softly.
    const x = Math.min(1, Math.max(0, intro));
    const k = closeUp ? 1 : x < 0.5 ? 4 * x ** 3 : 1 - (2 - 2 * x) ** 3 / 2;
    pos.lerpVectors(introPos, basePos, k);
    camera.position.set(
      pos.x + Math.sin(time * 61) * shake * 0.05,
      pos.y + Math.sin(time * 47) * shake * 0.04,
      pos.z,
    );
    lookTarget.lerpVectors(introLook, baseLook, k);
    camera.lookAt(lookTarget);
  }

  /** Used by perf.js to trade a little sharpness for smoothness on slow phones. */
  function setPixelRatio(r) {
    renderer.setPixelRatio(r);
    resize();
  }

  return { renderer, scene, camera, resize, kick, updateCamera, setPixelRatio };
}
