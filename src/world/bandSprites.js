// =============================================================================
// bandSprites.js — a pixel-art band made of sprite sheets (PixelLab art, see
// docs/ART_PIPELINE.md), standing on the 3D stage. One function builds ANY
// sprite band; bandArt.js lists the art sets (HD, Retro, ...).
//
// Each musician has a sprite sheet with one row per animation. A flat plane
// in the 3D world shows one cell of that sheet at a time.
//
// TWO KINDS OF ART SET:
//   * With an ANIMATION LIBRARY (Retro): dozens of animations sorted into
//     blocks (idle, groove, sing, accent, mistake, celebrate, bow). The
//     choreographer in animBlocks.js picks what each musician does.
//   * Classic sets (HD): just play (loop) · accent (big move) · mistake.
//     "play" loops every 2 beats, "accent" plays on big moments (every
//     25-hit combo, finished long notes), "mistake" when you miss.
// Either way the loops are driven by the song's real beats, so the band
// always moves in time with the music.
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
import { DRUM_RISER, BAND_SPOTS } from './stage.js';
import { createDirector, hasBlocks } from './animBlocks.js';
import { RIOT_EFFECTS } from './riotEffects.js';

const BAND_HEIGHT = 5.4;   // world units: how tall the tallest front-line musician is
const Z0 = WORLD.stageZ;
const TOP = WORLD.stageHeight;
const ACCENT_TIME = 0.6;   // seconds for the big-move animation
// How each musician wanders left and right while playing: [how far (world
// units), timing offset]. The bassist and singer stand close together, so
// they wander almost in step and never bump into each other; the guitarist
// moves the other way and stays near his mic stand; the drummer is behind
// his kit.
const DRIFT = { bassist: [0.55, 0], singer: [0.7, 0.6], guitarist: [0.35, 3.2], drummer: [0, 0] };
const DRIFT_BEATS = 16; // one full wander (left, right and back) every 4 bars
const SHRED_TIME = 5;   // seconds a gold-solo soloist floats
const MISTAKE_TIME = 0.72; // seconds for the stumble-and-recover animation

function pixelTexture(url) {
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter; // crisp pixels up close
  return tex;
}

/**
 * @param {THREE.Scene} scene
 * @param {{manifest: object, urls: Record<string, string>, kitScale?: number, drummerLift?: number}} art
 *   manifest = band.json from scripts/pixellab/fetch_and_pack.py;
 *   urls = image URL per member name, plus `drumkit`;
 *   kitScale / drummerLift = how big the kit is and how high the drummer
 *   stands behind it (see bandArt.js)
 */
export function createSpriteBand(scene, art) {
  const { manifest, urls, kitScale = 1, drummerLift: liftShare = 0.08 } = art;
  const group = new THREE.Group();
  scene.add(group);
  const shadowMat = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.4, depthWrite: false });

  // One pixel size for the whole band, chosen so the tallest front-line
  // musician is BAND_HEIGHT tall — any art style fills the stage the same.
  const tallest = Math.max(...Object.entries(manifest.members)
    .filter(([name]) => name !== 'drummer')
    .map(([, m]) => m.height || m.footY));
  const PX = BAND_HEIGHT / tallest;
  const drummerLift = liftShare * tallest; // pixels the drummer stands above the kit's base

  // Where each musician stands (feet position).
  const SPOTS = {
    bassist:   { ...BAND_SPOTS.bassist, y: TOP },
    singer:    { ...BAND_SPOTS.singer, y: TOP },
    guitarist: { ...BAND_SPOTS.guitarist, y: TOP },
    drummer:   { ...BAND_SPOTS.drummer, y: TOP + DRUM_RISER.h + drummerLift * PX },
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

    // A full animation library gets a choreographer; classic sets don't.
    const director = hasBlocks(info) ? createDirector(info, name, i + 1) : null;
    // Static art (no play animation yet) gets lots of code-driven motion;
    // fully drawn animation only needs a touch.
    const animated = director || info.anims.play?.frames > 1;
    return {
      name, info, mesh, tex, mat, ring, shadow, spot, director,
      motion: director ? 0.12 : animated ? 0.3 : 1,
      phase: i * 0.37, // so they don't all bob in perfect unison
      lastHit: -99, hitStrength: 0, lastMistake: -99,
    };
  });

  // RIOT MODE versions (if this art set has them): a second plane per
  // musician, hidden until Riot Mode starts. Same pixel size as the normal
  // band, so they swap in exactly in place.
  if (art.riot) {
    for (const m of members) {
      const info = art.riot.manifest.members[m.name];
      if (!info) continue;
      const [cw, ch] = info.cell;
      const geo = new THREE.PlaneGeometry(cw * PX, ch * PX);
      geo.translate(0, info.footY * PX - (ch * PX) / 2, 0);
      const tex = pixelTexture(art.riot.urls[m.name]);
      tex.repeat.set(1 / info.columns, 1 / info.rows);
      const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      group.add(mesh);
      // The Riot moves to rotate through: every "riot" block animation that
      // isn't marked "use": false in the recipe (e.g. one waiting for a redo).
      const moves = Object.entries(info.anims)
        .filter(([, a]) => a.block === 'riot' && a.use !== false)
        .map(([animName]) => animName);
      m.riot = { info, tex, mat, mesh, moves: moves.length ? moves : ['hub'] };
    }
  }
  // RIOT EFFECTS extras (see riotEffects.js), hidden until an effect needs
  // them: two see-through copies of each musician (ECHO's ghosts, GLITCH's
  // red and blue copies), for the normal look and the Riot look, and a halo
  // (GLORY). The copies share the musician's texture, so they always show
  // the same drawn frame.
  const ghostMat = (tex) => new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  for (const m of members) {
    const make = (source) => [0, 1].map(() => {
      const mesh = new THREE.Mesh(source.mesh.geometry, ghostMat(source.tex));
      mesh.visible = false;
      group.add(mesh);
      return mesh;
    });
    m.ghosts = make(m);
    if (m.riot) m.riot.ghosts = make(m.riot);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.62, 32),
      new THREE.MeshBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    halo.visible = false;
    group.add(halo);
    m.halo = halo;
    m.headY = (m.info.height || m.info.footY) * PX * 1.04; // a little above the head
  }
  let riotOn = false;
  let effect = RIOT_EFFECTS[0];  // which Riot effect is on (riotEffects.js)
  let effectStart = -1;          // when it started (-2 = on the next update)
  let away = null; // CENTER STAGE: the musician who is on the board right now
  const tint = new THREE.Color();

  // The drum kit sits in front of the drummer and hides his legs.
  const kitInfo = manifest.drumkit;
  const kitW = kitInfo.size[0] * PX * kitScale;
  const kitH = kitInfo.size[1] * PX * kitScale;
  const kitGeo = new THREE.PlaneGeometry(kitW, kitH);
  kitGeo.translate(0, kitH / 2, 0); // base on the riser
  const kit = new THREE.Mesh(kitGeo, new THREE.MeshBasicMaterial({ map: pixelTexture(urls.drumkit), alphaTest: 0.5 }));
  kit.position.set(DRUM_RISER.x, TOP + DRUM_RISER.h, DRUM_RISER.z);
  group.add(kit);

  // Props: extra objects on stage that belong to a musician, like the
  // guitarist's mic stand. Each is scaled so the mic sits at mouth height for
  // its owner. The mic stand only shows in songs he sings (see setVocalist).
  const micStands = [];
  for (const [name, prop] of Object.entries(manifest.props || {})) {
    const owner = SPOTS[prop.for];
    const ownerInfo = manifest.members[prop.for];
    if (!owner || !ownerInfo || !urls[name]) continue;
    const s = ((ownerInfo.height * 0.93) / prop.size[1]) * PX;
    const geo = new THREE.PlaneGeometry(prop.size[0] * s, prop.size[1] * s);
    geo.translate(0, (prop.size[1] * s) / 2, 0); // base on the floor
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: pixelTexture(urls[name]), alphaTest: 0.5 }));
    // Just in front of the musician, toward the middle of the stage, with
    // the mic pointing back at his face.
    mesh.position.set(owner.x - 1.25, owner.y, owner.z + 0.35);
    group.add(mesh);
    if (name === 'micstand') micStands.push(mesh);
  }

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
        // Every 100 in a row the whole band cheers; other milestones get a big move.
        for (const each of members) {
          if (e.combo % 100 === 0) each.director?.celebrate();
          else each.director?.accent(true);
        }
      } else if (e.type === 'hit' || e.type === 'holdComplete') {
        m.lastHit = t;
        m.hitStrength = e.type === 'holdComplete' ? 0.7 : e.grade === 'perfect' ? 0.35 : 0.2;
        if (e.type === 'holdComplete') m.director?.accent();
      }
      if (e.type === 'mistake') {
        m.lastMistake = t;
        m.director?.mistake();
      }
      if (e.type === 'riotStart') {
        // RIOT MODE! Everyone does their big move at once.
        for (const each of members) { each.lastHit = t; each.hitStrength = 1; each.director?.accent(true); }
      }
    },
    /** Who sings lead in this song: 'singer', 'guitarist' or 'duet'. */
    setVocalist(v) {
      for (const m of members) m.director?.setVocalist(v);
      // The guitarist only gets a mic in his songs (or duets).
      for (const mic of micStands) mic.visible = v === 'guitarist' || v === 'duet';
    },
    /**
     * SHRED! (a gold-medal solo): the soloist floats up off the stage for 5
     * seconds, wobbling with joy, then comes back down.
     */
    shred(name, t) {
      const m = members.find((each) => each.name === name);
      if (m) { m.shredStart = t; m.director?.celebrate(); }
    },
    /** CENTER STAGE: this musician has jumped onto the board (null = everyone's back). */
    setAway(name) { away = name; },
    /**
     * Riot Mode on/off, with one of the RIOT EFFECTS (riotEffects.js). Effects
     * with look 'riot' swap every musician to their Riot version.
     */
    setRiot(on, fx = RIOT_EFFECTS[0]) {
      riotOn = on;
      if (on) { effect = fx; effectStart = -2; }
      const riotArt = on && effect.look === 'riot';
      for (const m of members) {
        if (!m.riot) continue;
        m.riot.mesh.visible = riotArt;
        m.mesh.visible = !riotArt;
      }
    },
    /** The song finished: the band cheers, then bows. */
    finale() { for (const m of members) m.director?.finale(); },
    reset() {
      defeated = false;
      for (const m of members) { m.lastHit = m.lastMistake = m.shredStart = -99; m.hitStrength = 0; m.director?.reset(); }
      this.setRiot(false);
      away = null;
    },
    setDefeated(v) { defeated = v; },
    setVisible(v) { group.visible = v; },

    /**
     * @param {number} t       game time (or a menu clock)
     * @param {number} beat    beat position
     * @param {boolean} live   a song is playing
     * @param {number} dt
     * @param {number} energy  0..1 how big this part of the song is
     * @param {string} section current section name (VERSE 1, CHORUS 2...)
     */
    update(t, beat, live = false, dt = 0, energy = 0, section = '') {
      if (!group.visible) return;
      const ctx = { live, energy: energy >= 0.7 ? 'hype' : 'calm', section, defeated };
      for (const m of members) {
        const sinceMiss = t - m.lastMistake;
        const sinceHit = t - m.lastHit;
        const missing = sinceMiss >= 0 && sinceMiss < MISTAKE_TIME;
        // Classic sets fake the big move in code; libraries have it drawn.
        const accenting = !m.director && m.hitStrength >= 0.7 && sinceHit >= 0 && sinceHit < ACCENT_TIME;

        // 1. Which drawn frame to show
        if (m.director) {
          const pick = m.director.update(beat, ctx);
          show(m, pick.anim, pick.frame);
          if (riotOn && m.riot && effect.look === 'riot') {
            // Riot version: a new move every 2 bars, rotating through every
            // Riot move this musician has (m.riot.moves).
            const moves = m.riot.moves;
            const a = m.riot.info.anims[moves[Math.floor(beat / 8) % moves.length]];
            const len = a.beats || 2;
            const frame = Math.floor((((beat / len) % 1) + 1) % 1 * a.frames);
            m.riot.tex.offset.set(frame / m.riot.info.columns, 1 - (a.row + 1) / m.riot.info.rows);
          }
        } else if (defeated) show(m, 'mistake', 3); // slumped
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
        // Wander: a slow drift left and right across the stage (see DRIFT).
        const [far, offset] = DRIFT[m.name] ?? [0, 0];
        const drift = defeated ? 0 : Math.sin((beat / DRIFT_BEATS) * Math.PI * 2 + offset) * far;
        m.mesh.position.x = m.spot.x + drift;
        m.shadow.position.x = m.spot.x + drift;
        m.ring.position.x = m.spot.x + drift;
        // SHRED: float up and down again over 5 seconds (see shred()).
        const sinceShred = t - (m.shredStart ?? -99);
        if (sinceShred >= 0 && sinceShred < SHRED_TIME) {
          const k = sinceShred / SHRED_TIME;
          y += Math.sin(Math.PI * k) * 2.2;
          tilt += Math.sin(sinceShred * 9) * 0.12;
        }
        // RIOT EFFECTS: extra motion and colour while Riot Mode is on.
        const fxOn = riotOn ? effect.id : null;
        if (effectStart === -2) effectStart = t;
        const fk = fxOn ? Math.min(1, Math.max(0, (t - effectStart) / 0.5)) : 0; // eases in
        const i = m.info.lane;
        let r = 1, gr = 1, bl = 1;   // colour tint (1 = none)
        let ghostSpread = 0;         // ECHO / GLITCH copies
        let jitter = 0;
        if (fxOn === 'giants') {
          const stomp = Math.pow(1 - ((((beat % 1) + 1) % 1)), 4);   // a stomp on every beat
          sx *= 1 + 0.55 * fk;
          sy *= (1 + 0.55 * fk) * (1 - 0.06 * stomp * fk);
        } else if (fxOn === 'zerog') {
          y += fk * (1.3 + 0.5 * Math.sin(t * 1.2 + i * 1.7));
          tilt += fk * 0.3 * Math.sin(t * 0.8 + i * 2.1);
        } else if (fxOn === 'disco') {
          tint.setHSL(((t * 0.45 + i * 0.25) % 1 + 1) % 1, 1, 0.62);
          ({ r, g: gr, b: bl } = tint);
          ghostSpread = 0.001; // one glowing copy right on top, in the same colour
          y += fk * 0.35 * Math.abs(Math.sin(beat * Math.PI));
          tilt += fk * 0.16 * Math.sin(beat * Math.PI);
        } else if (fxOn === 'echo') {
          ghostSpread = 1.15 + 0.35 * Math.sin(t * 2 + i);
        } else if (fxOn === 'glitch') {
          // Every 1/12 s there's a chance of a jump, a squash or a blink.
          const step = Math.floor(t * 12) + i * 7;
          const rnd = (Math.sin(step * 12.9898) * 43758.5453) % 1;
          if (Math.abs(rnd) < 0.3) jitter = (rnd * 3) * 0.6;
          if (Math.abs(rnd) > 0.9) sy *= 0.8;
          ghostSpread = 0.22;
        } else if (fxOn === 'glory') {
          r = 1; gr = 0.95; bl = 0.78; // warm golden light
          y += fk * 0.45 * (0.5 + 0.5 * Math.sin(t * 1.5 + i));
        } else if (fxOn === 'voltage') {
          if (Math.random() < 0.3) { r = 0.65; gr = 0.9; bl = 1; } // flickering blue
        }

        const baseX = m.mesh.position.x + jitter * fk;
        m.mesh.position.x = baseX;
        m.mesh.position.y = m.spot.y + y;
        m.mesh.rotation.z = tilt;
        m.mesh.scale.set(sx, sy, 1);

        // CENTER STAGE: whoever is away on the board isn't on the stage.
        // (GLITCH also makes them blink now and then.)
        const here = m.name !== away && !(fxOn === 'glitch' && Math.random() < 0.04);
        const riotArt = riotOn && effect.look === 'riot' && m.riot;
        m.mesh.visible = here && !riotArt;
        m.shadow.visible = here;

        const flash = sinceMiss >= 0 && sinceMiss < 0.3 ? 0.6 : 1; // red flash on a miss
        m.mat.color.setRGB(r, gr * flash, bl * flash);
        if (m.riot) {
          m.riot.mesh.visible = here && !!riotArt;
          // The Riot version moves exactly like the normal one.
          m.riot.mesh.position.copy(m.mesh.position);
          m.riot.mesh.rotation.z = tilt;
          m.riot.mesh.scale.set(sx, sy, 1);
          m.riot.mat.color.setRGB(r, gr * flash, bl * flash);
        }
        // The see-through copies (ECHO: ghosts either side; GLITCH: red and blue).
        const shown = riotArt ? m.riot : m;
        for (const set of [m.ghosts, m.riot?.ghosts]) {
          if (!set) continue;
          set.forEach((gh, n) => {
            const on = here && ghostSpread > 0 && (set === shown.ghosts);
            gh.visible = on;
            if (!on) return;
            const side = n ? 1 : -1;
            gh.position.set(baseX + side * ghostSpread * fk, m.mesh.position.y + (fxOn === 'echo' ? Math.sin(t * 3 + n) * 0.15 : 0), m.mesh.position.z - 0.05);
            gh.rotation.z = fxOn === 'echo' ? -tilt : tilt;
            gh.scale.set(sx, sy, 1);
            if (fxOn === 'glitch') gh.material.color.set(n ? '#00e5ff' : '#ff2bd6');
            else if (fxOn === 'disco') gh.material.color.setRGB(r, gr, bl);
            else gh.material.color.set('#9fd8ff');
            gh.material.opacity = (fxOn === 'glitch' ? 0.7 : fxOn === 'disco' ? (n ? 0 : 0.6) : 0.55) * fk;
          });
        }
        // GLORY: a halo floats above each head.
        m.halo.visible = here && fxOn === 'glory';
        if (m.halo.visible) {
          m.halo.position.set(baseX, m.mesh.position.y + m.headY * sy, m.mesh.position.z + 0.1);
          m.halo.rotation.set(-1.25, 0, Math.sin(t * 2 + i) * 0.1);
          m.halo.material.opacity = 0.85 * fk;
        }

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
