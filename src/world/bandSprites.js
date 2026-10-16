// =============================================================================
// bandSprites.js — a pixel-art band made of sprite sheets (PixelLab art, see
// docs/ART_PIPELINE.md), standing on the 3D stage. One function builds ANY
// sprite band; bandArt.js lists the art sets (HD, Retro, ...).
//
// Each musician has a sprite sheet with one row per animation:
//   idle (1 frame) · play (loop) · accent (big move) · mistake
// A flat plane in the 3D world shows one cell of that sheet at a time.
//
// TIMING: the "play" loop is driven by the song's real beats (one loop every
// 2 beats), so the band always moves in time with the music. "accent" plays
// on big moments (every 25-hit combo, finished long notes) and "mistake" plays
// when you miss that musician's note.
//
// EXTRA MOTION: on top of the drawn frames, the code bobs, sways, bounces and
// wobbles each sprite. Art sets that don't have animations yet (a single
// frame) get a lot of this motion so they still feel alive; fully animated
// sets get just a touch.
//
// Every sprite in a band uses the same pixel size in the world (PX), so the
// whole band shares one consistent pixel density.
// =============================================================================
import * as THREE from 'three';
import { WORLD, LANES } from '../config.js';
import { DRUM_RISER } from './stage.js';

const BAND_HEIGHT = 5.4;   // world units: how tall the tallest front-line musician is
const Z0 = WORLD.stageZ;
const TOP = WORLD.stageHeight;
const ACCENT_TIME = 0.6;   // seconds for the big-move animation
const MISTAKE_TIME = 0.72; // seconds for the stumble-and-recover animation

function pixelTexture(url) {
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter; // crisp pixels up close
  return tex;
}

/**
 * @param {THREE.Scene} scene
 * @param {{manifest: object, urls: Record<string, string>}} art
 *   manifest = band.json from scripts/pixellab/fetch_and_pack.py;
 *   urls = image URL per member name, plus `drumkit`
 */
export function createSpriteBand(scene, art) {
  const { manifest, urls } = art;
  const group = new THREE.Group();
  scene.add(group);
  const shadowMat = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.4, depthWrite: false });

  // One pixel size for the whole band, chosen so the tallest front-line
  // musician is BAND_HEIGHT tall — any art style fills the stage the same.
  const tallest = Math.max(...Object.entries(manifest.members)
    .filter(([name]) => name !== 'drummer')
    .map(([, m]) => m.height || m.footY));
  const PX = BAND_HEIGHT / tallest;
  const drummerLift = 0.08 * tallest; // pixels the drummer stands above the kit's base

  // Where each musician stands (feet position).
  const SPOTS = {
    bassist:   { x: -5.0, y: TOP, z: Z0 - 2.3 },
    singer:    { x: -1.5, y: TOP, z: Z0 - 1.3 },
    guitarist: { x: 5.0,  y: TOP, z: Z0 - 2.3 },
    drummer:   { x: DRUM_RISER.x, y: TOP + DRUM_RISER.h + drummerLift * PX, z: DRUM_RISER.z - 0.4 },
  };

  const members = Object.entries(manifest.members).map(([name, info], i) => {
    const [cw, ch] = info.cell;
    const geo = new THREE.PlaneGeometry(cw * PX, ch * PX);
    // The cell's top edge is at +h/2; the feet are footY pixels below it.
    // Shift the plane so the feet sit exactly at y = 0 (the stage floor),
    // which also makes the feet the pivot for tilting and squashing.
    geo.translate(0, info.footY * PX - (ch * PX) / 2, 0);
    const tex = pixelTexture(urls[name]);
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

    // Static art (no play animation yet) gets lots of code-driven motion.
    const animated = info.anims.play.frames > 1;
    return {
      name, info, mesh, tex, mat, ring, spot, animated,
      motion: animated ? 0.3 : 1,
      phase: i * 0.37, // so they don't all bob in perfect unison
      lastHit: -99, hitStrength: 0, lastMistake: -99,
    };
  });

  // The drum kit sits in front of the drummer and hides his legs.
  const kitInfo = manifest.drumkit;
  const kitGeo = new THREE.PlaneGeometry(kitInfo.size[0] * PX, kitInfo.size[1] * PX);
  kitGeo.translate(0, (kitInfo.size[1] * PX) / 2, 0); // base on the riser
  const kit = new THREE.Mesh(kitGeo, new THREE.MeshBasicMaterial({ map: pixelTexture(urls.drumkit), alphaTest: 0.5 }));
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
      for (const m of members) {
        const sinceMiss = t - m.lastMistake;
        const sinceHit = t - m.lastHit;
        const missing = sinceMiss >= 0 && sinceMiss < MISTAKE_TIME;
        const accenting = m.hitStrength >= 0.7 && sinceHit >= 0 && sinceHit < ACCENT_TIME;

        // 1. Which drawn frame to show
        if (defeated) show(m, 'mistake', 3); // slumped
        else if (missing) show(m, 'mistake', Math.floor((sinceMiss / MISTAKE_TIME) * m.info.anims.mistake.frames));
        else if (accenting) show(m, 'accent', Math.floor((sinceHit / ACCENT_TIME) * m.info.anims.accent.frames));
        else show(m, 'play', Math.floor((((beat / 2) % 1) + 1) % 1 * m.info.anims.play.frames));

        // 2. Code-driven motion on top (pivot = feet)
        const k = m.motion;
        const b = beat + m.phase;
        const onBeat = Math.pow(1 - ((((b % 1) + 1) % 1)), 3);  // 1 on the beat, fading
        let y = 0;
        let tilt = 0;
        let sx = 1;
        let sy = 1;
        if (defeated) {
          tilt = 0.12 * k;
          sy = 1 - 0.08 * k;
        } else {
          // groove: bob down on each beat and sway side to side every 2 beats
          y = -onBeat * 0.12 * k;
          tilt = Math.sin(b * Math.PI) * 0.05 * k;
          sx = 1 + onBeat * 0.04 * k;
          sy = 1 - onBeat * 0.04 * k;
          if (sinceHit >= 0 && sinceHit < 0.2) {           // hit: quick bounce up
            const h = (0.2 - sinceHit) * 5 * m.hitStrength;
            y += h * 0.35 * k;
            sy += h * 0.12;
            sx -= h * 0.06;
          }
          if (accenting) {                                   // big move: jump + lean
            const a = Math.sin((sinceHit / ACCENT_TIME) * Math.PI);
            y += a * 1.2 * k;
            tilt += a * -0.18 * k * (m.info.lane % 2 ? 1 : -1);
          }
          if (missing) {                                     // miss: wobble and droop
            const w = 1 - sinceMiss / MISTAKE_TIME;
            tilt += Math.sin(sinceMiss * 38) * 0.14 * w * k;
            y -= 0.2 * w * k;
          }
        }
        m.mesh.position.y = m.spot.y + y;
        m.mesh.rotation.z = tilt;
        m.mesh.scale.set(sx, sy, 1);

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
