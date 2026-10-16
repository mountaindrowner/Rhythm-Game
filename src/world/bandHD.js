// =============================================================================
// bandHD.js — the "HD pixel" band: hand-animated pixel-art sprites made with
// PixelLab (see docs/ART_PIPELINE.md), standing on the 3D stage.
//
// Each musician has a sprite sheet with one row per animation:
//   idle (1 frame) · play (8-frame loop) · accent (big move) · mistake
// A flat plane in the 3D world shows one cell of that sheet at a time.
//
// TIMING: the "play" loop is driven by the song's real beats (8 frames every
// 2 beats), so the band always moves in time with the music. "accent" plays
// on big moments (every 25-hit combo, finished long notes) and "mistake" plays
// when you miss that musician's note.
//
// Every sprite uses the same pixel size in the world (PX), so the whole band
// shares one consistent pixel density.
// =============================================================================
import * as THREE from 'three';
import { WORLD, LANES } from '../config.js';
import { DRUM_RISER } from './stage.js';
import manifest from '../../assets/art/pixellab/band.json';
import bassistUrl from '../../assets/art/pixellab/bassist.png';
import singerUrl from '../../assets/art/pixellab/singer.png';
import guitaristUrl from '../../assets/art/pixellab/guitarist.png';
import drummerUrl from '../../assets/art/pixellab/drummer.png';
import drumkitUrl from '../../assets/art/pixellab/drumkit.png';

const URLS = { bassist: bassistUrl, singer: singerUrl, guitarist: guitaristUrl, drummer: drummerUrl };
// One pixel size for the whole band, so every sprite has the same pixel
// density. It's chosen so the tallest front-line musician is BAND_HEIGHT tall,
// which means any art style (64 px retro or 128 px HD) fills the stage the same.
const BAND_HEIGHT = 5.4;     // world units
const tallest = Math.max(...Object.entries(manifest.members)
  .filter(([name]) => name !== 'drummer')
  .map(([, m]) => m.height || m.footY));
const PX = BAND_HEIGHT / tallest; // world units per sprite pixel
const Z0 = WORLD.stageZ;
const TOP = WORLD.stageHeight;
const DRUMMER_LIFT = 0.08 * tallest; // pixels the drummer stands above the kit's base

// Where each musician stands (feet position).
const SPOTS = {
  bassist:   { x: -5.0, y: TOP, z: Z0 - 2.3 },
  singer:    { x: -1.5, y: TOP, z: Z0 - 1.3 },
  guitarist: { x: 5.0,  y: TOP, z: Z0 - 2.3 },
  drummer:   { x: DRUM_RISER.x, y: TOP + DRUM_RISER.h + DRUMMER_LIFT * PX, z: DRUM_RISER.z - 0.4 },
};

const ACCENT_TIME = 0.6;   // seconds for the big-move animation
const MISTAKE_TIME = 0.72; // seconds for the stumble-and-recover animation

function pixelTexture(url) {
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter; // crisp pixels up close
  return tex;
}

export function createBandHD(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const shadowMat = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.4, depthWrite: false });

  const members = Object.entries(manifest.members).map(([name, info]) => {
    const [cw, ch] = info.cell;
    const geo = new THREE.PlaneGeometry(cw * PX, ch * PX);
    // The cell's top edge is at +h/2; the feet are footY pixels below it.
    // Shift the plane so the feet sit exactly at y = 0 (the stage floor).
    geo.translate(0, info.footY * PX - (ch * PX) / 2, 0);
    const tex = pixelTexture(URLS[name]);
    tex.repeat.set(1 / info.columns, 1 / info.rows);
    const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    const spot = SPOTS[name];
    mesh.position.set(spot.x, spot.y, spot.z);
    group.add(mesh);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.y = 0.4;
    shadow.position.set(spot.x, spot.y + 0.01, spot.z + 0.1);
    if (name !== 'drummer') group.add(shadow);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1, 40),
      new THREE.MeshBasicMaterial({
        color: LANES[info.lane].color, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(spot.x, spot.y + 0.03, spot.z + 0.2);
    group.add(ring);

    return {
      name, info, mesh, tex, mat, ring, spot,
      lastHit: -99, hitStrength: 0, lastMistake: -99,
    };
  });

  // The drum kit sits in front of the drummer and hides his legs.
  const kitInfo = manifest.drumkit;
  const kitTex = pixelTexture(drumkitUrl);
  const kitGeo = new THREE.PlaneGeometry(kitInfo.size[0] * PX, kitInfo.size[1] * PX);
  kitGeo.translate(0, (kitInfo.size[1] * PX) / 2, 0); // base on the riser
  const kit = new THREE.Mesh(kitGeo, new THREE.MeshBasicMaterial({ map: kitTex, alphaTest: 0.5 }));
  kit.position.set(DRUM_RISER.x, TOP + DRUM_RISER.h, DRUM_RISER.z);
  group.add(kit);

  let defeated = false;
  const byLane = [];
  for (const m of members) byLane[m.info.lane] = m;

  function show(m, anim, frame) {
    const a = m.info.anims[anim];
    const col = Math.min(a.frames - 1, Math.max(0, frame));
    m.tex.offset.set(col / m.info.columns, 1 - (a.row + 1) / m.info.rows);
  }

  return {
    onEvent(e, t) {
      const m = byLane[e.lane];
      if (e.type === 'hit' && e.milestone) {
        for (const each of members) { each.lastHit = t; each.hitStrength = 1; }
      } else if (e.type === 'hit' || e.type === 'holdComplete') {
        m.lastHit = t;
        m.hitStrength = e.type === 'holdComplete' ? 0.7 : e.grade === 'perfect' ? 0.35 : 0.2;
      }
      if (e.type === 'mistake') m.lastMistake = t;
    },
    reset() {
      defeated = false;
      for (const m of members) { m.lastHit = m.lastMistake = -99; m.hitStrength = 0; }
    },
    setDefeated(v) { defeated = v; },
    setVisible(v) { group.visible = v; },

    /**
     * @param {number} t     game time (or a menu clock)
     * @param {number} beat  beat position
     */
    update(t, beat) {
      if (!group.visible) return;
      const phase = ((beat % 1) + 1) % 1;
      for (const m of members) {
        const sinceMiss = t - m.lastMistake;
        const sinceHit = t - m.lastHit;
        let bounce = 0;
        if (defeated) {
          show(m, 'mistake', 3); // slumped
        } else if (sinceMiss >= 0 && sinceMiss < MISTAKE_TIME) {
          show(m, 'mistake', Math.floor((sinceMiss / MISTAKE_TIME) * m.info.anims.mistake.frames));
        } else if (m.hitStrength >= 0.7 && sinceHit >= 0 && sinceHit < ACCENT_TIME) {
          show(m, 'accent', Math.floor((sinceHit / ACCENT_TIME) * m.info.anims.accent.frames));
        } else {
          // Play loop locked to the beat: 8 frames every 2 beats.
          const frames = m.info.anims.play.frames;
          show(m, 'play', Math.floor(((beat / 2) % 1 + 1) % 1 * frames));
          if (sinceHit >= 0 && sinceHit < 0.2) bounce = (0.2 - sinceHit) * m.hitStrength * 2;
        }
        // A tiny squash-and-stretch on the beat and on hits.
        const pulse = defeated ? 0 : Math.pow(1 - phase, 4) * 0.02;
        m.mesh.scale.set(1 + pulse - bounce * 0.15, 1 - pulse + bounce * 0.25, 1);
        const flash = sinceMiss >= 0 && sinceMiss < 0.3 ? 0.6 : 1; // red flash on a miss
        m.mat.color.setRGB(1, flash, flash);

        if (sinceHit >= 0 && sinceHit < 0.45) {
          const s = 1 + sinceHit * 5;
          m.ring.scale.set(s, s, s);
          m.ring.material.opacity = 0.9 * (1 - sinceHit / 0.45) * Math.max(0.4, m.hitStrength);
        } else {
          m.ring.material.opacity = 0;
        }
      }
    },
  };
}
