// =============================================================================
// showfx.js — the big concert effects that make choruses feel huge:
//   * PYRO: fire jets at the front of the stage, on the downbeat of each bar
//   * LASERS: beams fanning out over the crowd
//   * CONFETTI: a burst from the truss when a chorus starts
//   * CROWD LIGHTS: phone lights swaying in the air (choruses and the bridge)
//   * STROBE: a quick white flash when a chorus hits (softer with
//     Settings → Reduce flashing)
//   * RIOT MODE: everything at full blast (pyro every half bar, lasers)
//   * TUMBLEWEED: when the show is over, one rolls across the empty stage
// =============================================================================
import * as THREE from 'three';
import { WORLD } from '../config.js';
import { Particles, softDot } from './effects.js';
import { moodFor, BAND_SPOTS } from './stage.js';
import { createRiotSign } from './riotSign.js';

const Z0 = WORLD.stageZ;
const TOP = WORLD.stageHeight;
const PYRO_X = [-8.4, -3.3, 3.3, 8.4];

export function createShowFx(scene, fans, flashEl) {
  const fire = new Particles(scene, { max: 600, size: 0.42, gravity: -1, drag: 2 });
  const confetti = new Particles(scene, { max: 500, size: 0.16, additive: false, gravity: 1.6, drag: 1.2, square: true });
  const FIRE = ['#c41f0a', '#e8460f', '#f07a14', '#d89a20'].map((c) => new THREE.Color(c));
  const SPARKLE = ['#d9c8ff', '#9fe8ff'].map((c) => new THREE.Color(c)); // ZERO GRAVITY
  const PARTY = ['#63ff79', '#ffbe3b', '#4bbdff', '#ff5b5b', '#ff5bd1', '#ffffff'].map((c) => new THREE.Color(c));

  // A light that flares orange when the pyro fires, lighting the band.
  const pyroLight = new THREE.PointLight('#ff8a3d', 0, 30, 1.2);
  pyroLight.position.set(0, TOP + 2, Z0 + 1.5);
  scene.add(pyroLight);
  // Nozzles for the fire jets
  for (const x of PYRO_X) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.3, 10), new THREE.MeshLambertMaterial({ color: '#2a2a33' }));
    nozzle.position.set(x, TOP + 0.15, Z0 + 0.4);
    scene.add(nozzle);
  }

  // Lasers: long thin glowing cylinders, pivoting at the back of the stage.
  const lasers = [];
  for (let i = 0; i < 6; i++) {
    const geo = new THREE.CylinderGeometry(0.035, 0.035, 45, 6, 1, true);
    geo.translate(0, 22.5, 0);
    geo.rotateX(Math.PI / 2); // point along +z (toward the crowd)
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: '#ffffff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    m.position.set(-5 + i * 2, TOP + 7.8, Z0 - 7.5);
    scene.add(m);
    lasers.push(m);
  }

  // Crowd phone lights: one soft dot above roughly every other fan.
  const lightFans = fans.filter((_, i) => i % 2 === 0);
  const lightPos = new Float32Array(lightFans.length * 3);
  const lightGeo = new THREE.BufferGeometry();
  lightGeo.setAttribute('position', new THREE.BufferAttribute(lightPos, 3));
  const lightMat = new THREE.PointsMaterial({
    size: 0.32, map: softDot(), color: '#fff3c4', transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  scene.add(new THREE.Points(lightGeo, lightMat));

  // A pixel-art tumbleweed (drawn once into a small canvas) for game over.
  const tw = document.createElement('canvas');
  tw.width = tw.height = 32;
  const twg = tw.getContext('2d');
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * Math.PI * 2 * 3.3;
    const r = 6 + (i % 9);
    twg.fillStyle = i % 3 ? '#a8794a' : '#7a5232';
    twg.fillRect(16 + Math.round(Math.cos(a) * r * 0.9), 16 + Math.round(Math.sin(a * 1.3) * r * 0.8), 2, 2);
  }
  const twTex = new THREE.CanvasTexture(tw);
  twTex.magFilter = THREE.NearestFilter;
  twTex.colorSpace = THREE.SRGBColorSpace;
  const tumble = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: twTex, alphaTest: 0.5 }));
  tumble.visible = false;
  scene.add(tumble);
  let tumbleStart = -1;

  // Solo spotlight: a bright beam straight down on the soloist.
  const soloBeam = new THREE.Mesh(
    (() => { const g = new THREE.ConeGeometry(1.7, 10, 24, 1, true); g.translate(0, -5, 0); return g; })(),
    new THREE.MeshBasicMaterial({
      color: '#fff6dc', transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, fog: false,
    }),
  );
  soloBeam.visible = false;
  scene.add(soloBeam);
  let soloWho = null;

  // SHRED moment: flames under the floating soloist and lightning from the truss.
  let shredWho = null;
  let shredStart = -1;
  const boltMat = new THREE.LineBasicMaterial({ color: '#d8f0ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
  const bolts = [0, 1, 2].map(() => {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 9 }, () => new THREE.Vector3())), boltMat);
    scene.add(line);
    return line;
  });

  // RIOT STRIKE: when Riot Mode starts, lightning hits every band member at
  // once. Lines are always 1 pixel thin in WebGL, so each bolt is drawn as
  // three lines side by side to look thicker.
  const strikeMat = new THREE.LineBasicMaterial({
    color: '#e8f6ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false,
  });
  const STRIKE_POINTS = 12;
  const strikeBolts = Object.entries(BAND_SPOTS).map(([name, spot]) => {
    const lines = [0, 1, 2].map(() => {
      const geo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: STRIKE_POINTS }, () => new THREE.Vector3()));
      const line = new THREE.Line(geo, strikeMat);
      line.renderOrder = 9;
      line.frustumCulled = false;
      scene.add(line);
      return line;
    });
    return { lines, spot, head: TOP + (name === 'drummer' ? 4.4 : 3.2) };
  });
  let strikeStart = -1;

  const riotSign = createRiotSign(scene); // the floating "RIOT MODE!" sign

  // ---- RIOT EFFECTS: stage extras for some of the effects (riotEffects.js) ----
  let effectId = null;
  let effectLevel = 0; // fades the extras in and out
  // GLORY: golden light rays fanning out behind the band, slowly turning.
  const rayCanvas = document.createElement('canvas');
  rayCanvas.width = rayCanvas.height = 256;
  {
    const rg = rayCanvas.getContext('2d');
    const grd = rg.createRadialGradient(128, 128, 10, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255,250,220,1)');
    grd.addColorStop(0.4, 'rgba(255,220,120,0.6)');
    grd.addColorStop(1, 'rgba(255,200,80,0)');
    rg.fillStyle = grd;
    for (let k = 0; k < 16; k++) {
      const a0 = (k / 16) * Math.PI * 2;
      rg.beginPath();
      rg.moveTo(128, 128);
      rg.arc(128, 128, 128, a0, a0 + Math.PI / 22);
      rg.closePath();
      rg.fill();
    }
  }
  const rays = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(rayCanvas), transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false,
  }));
  rays.position.set(0, TOP + 4, BAND_SPOTS.drummer.z - 1.5);
  rays.visible = false;
  scene.add(rays);
  // HIGH VOLTAGE: electric arcs between the musicians.
  const ARC_PAIRS = [['bassist', 'singer'], ['singer', 'guitarist'], ['singer', 'drummer'], ['drummer', 'guitarist']];
  const arcMat = new THREE.LineBasicMaterial({ color: '#cfefff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false });
  const arcs = [...ARC_PAIRS, ...ARC_PAIRS].map(() => { // two lines per pair = a thicker bolt
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 10 }, () => new THREE.Vector3())), arcMat);
    line.frustumCulled = false;
    line.renderOrder = 9;
    line.visible = false;
    scene.add(line);
    return line;
  });
  // DISCO FEVER: a mirror ball turning high above the stage.
  const discoBall = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.1, 1),
    new THREE.MeshPhongMaterial({ color: '#d8e0ff', specular: '#ffffff', shininess: 120, flatShading: true, emissive: '#222244' }),
  );
  discoBall.position.set(0, TOP + 8.2, Z0 - 0.8);
  discoBall.visible = false;
  scene.add(discoBall);

  let riot = false;
  let lastBar = -1;
  let lastHalf = -1;
  let laserLevel = 0;
  let lightLevel = 0;
  let pyroFlash = 0;
  let reduceFlashing = false;
  const laserColor = new THREE.Color();

  function pyro(which) {
    for (const i of which) {
      const x = PYRO_X[i];
      for (let k = 0; k < 32; k++) {
        fire.emit(
          x + (Math.random() - 0.5) * 0.3, TOP + 0.3, Z0 + 0.4 + (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 1.4, 5 + Math.random() * 5, (Math.random() - 0.5) * 1.2,
          FIRE[(Math.random() * FIRE.length) | 0], 0.3 + Math.random() * 0.35,
        );
      }
    }
    pyroFlash = 1;
  }

  function confettiBurst(count = 260) {
    for (let k = 0; k < count; k++) {
      confetti.emit(
        (Math.random() - 0.5) * 18, 9.5 + Math.random(), Z0 + Math.random() * 9,
        (Math.random() - 0.5) * 4, Math.random() * 2, Math.random() * 2,
        PARTY[(Math.random() * PARTY.length) | 0], 3 + Math.random() * 2,
      );
    }
  }

  function strobe() {
    flashEl.style.setProperty('--flash-strength', reduceFlashing ? '0.1' : '0.4');
    flashEl.classList.remove('pop');
    void flashEl.offsetWidth;
    flashEl.classList.add('pop');
  }

  return {
    setReduceFlashing(v) { reduceFlashing = v; },

    /** Riot Mode on/off. Turning it on fires everything at once. */
    /** Riot Mode on/off, with one of the RIOT EFFECTS (its name goes on the sign). */
    setRiot(on, fx = null) {
      if (on && !riot) {
        strobe();
        pyro([0, 1, 2, 3]);
        confettiBurst(360);
      }
      if (on) {
        effectId = fx?.id || 'inferno';
        riotSign.setText(fx?.name || 'RIOT MODE!', fx?.colors);
        riotSign.show();
      } else riotSign.hide();
      riot = on;
    },

    /** Solo spotlight on a band member ('guitarist', ...), or off with null. */
    setSoloSpot(who) { soloWho = who; },

    /** A gold solo: flames and lightning for whoever is floating. */
    shred(who) {
      shredWho = who;
      shredStart = -2; // starts on the next update
      strobe();
    },

    /** Transformation burst: fire and sparks around every band member (Riot Mode on/off). */
    transform() {
      for (const spot of Object.values(BAND_SPOTS)) {
        for (let k = 0; k < 40; k++) {
          const a = Math.random() * Math.PI * 2;
          fire.emit(spot.x + Math.cos(a) * 0.9, TOP + 1.2 + Math.random() * 3, spot.z + 0.4,
            Math.cos(a) * 3, Math.random() * 3, 0.5, FIRE[(Math.random() * FIRE.length) | 0], 0.5);
        }
      }
      strobe();
    },

    /** Lightning strikes the whole band (Riot Mode starts). */
    lightning() {
      strikeStart = -2; // starts on the next update
      strobe();
    },

    /** A small fire pop (Big Rock Ending taps). */
    pop() {
      pyro([(Math.random() * 4) | 0]);
    },

    /** Game over gag: a tumbleweed rolls across the stage. */
    tumbleweed() { tumbleStart = -2; }, // starts on the next update

    /** A big moment (combo milestone, song finished). */
    celebrate(withConfetti = true) {
      pyro([0, 1, 2, 3]);
      if (withConfetti) confettiBurst();
    },

    /** Called when the song moves to a new section. */
    onSection(section) {
      const big = section.includes('CHORUS') || section === 'OUTRO';
      if (big) {
        strobe();
        pyro([0, 1, 2, 3]);
        confettiBurst(section.startsWith('FINAL') ? 420 : 260);
      }
    },

    clear() {
      fire.clear();
      confetti.clear();
      lastBar = lastHalf = -1;
      riot = false;
      tumbleStart = -1;
      tumble.visible = false;
      soloWho = shredWho = null;
      riotSign.clear();
      soloBeam.visible = false;
      boltMat.opacity = 0;
      strikeMat.opacity = 0;
      strikeStart = -1;
      effectId = null;
      effectLevel = 0;
      rays.visible = false;
      discoBall.visible = false;
      for (const a of arcs) a.visible = false;
    },

    /**
     * @param {number} time     steady clock (seconds)
     * @param {number} beat     beat position in the song
     * @param {string} section  current section name
     * @param {boolean} live    a song is playing
     * @param {number} dt
     */
    update(time, beat, section, live, dt) {
      const big = live && (riot || section.includes('CHORUS') || section === 'OUTRO');
      const final = riot || section.startsWith('FINAL') || section === 'OUTRO';

      // Pyro on each bar's downbeat during choruses (every half bar in the finale).
      const bar = Math.floor(beat / 4);
      const half = Math.floor(beat / 2);
      if (big && bar !== lastBar && lastBar >= 0) pyro(bar % 2 ? [0, 3] : [1, 2]);
      else if (big && final && half !== lastHalf && half % 2 === 1) pyro(half % 4 === 1 ? [0, 3] : [1, 2]);
      lastBar = bar;
      lastHalf = half;

      // Lasers fade in for choruses (and a little for builds).
      const laserGoal = riot && live ? 0.9 : big ? 0.5 : live && section.includes('BUILD') ? 0.2 : 0;
      laserLevel += (laserGoal - laserLevel) * (1 - Math.exp(-dt * 4));
      const [main, accent] = moodFor(section);
      lasers.forEach((l, i) => {
        l.visible = laserLevel > 0.01;
        l.rotation.y = Math.sin(time * 0.9 + i * 0.8) * 0.6;
        l.rotation.x = -0.12 + Math.sin(time * 1.3 + i) * 0.1;
        laserColor.set(i % 2 ? main : accent);
        l.material.color.copy(laserColor);
        l.material.opacity = laserLevel * (0.7 + 0.3 * Math.sin(time * 9 + i));
      });

      // Crowd phone lights sway during choruses and the bridge.
      const lightGoal = live && (big || section === 'BRIDGE') ? 1 : 0;
      lightLevel += (lightGoal - lightLevel) * (1 - Math.exp(-dt * 2));
      lightMat.opacity = lightLevel * 0.9;
      lightFans.forEach((f, i) => {
        lightPos[i * 3] = f.x + Math.sin(time * 1.5 + f.phase) * 0.35;
        lightPos[i * 3 + 1] = 2.7 * f.s + Math.sin(time * 3 + f.phase) * 0.08; // held-up phones
        lightPos[i * 3 + 2] = f.z;
      });
      lightGeo.attributes.position.needsUpdate = true;

      // Solo spotlight fades in over the soloist.
      const spot = soloWho && BAND_SPOTS[soloWho];
      soloBeam.visible = !!spot || soloBeam.material.opacity > 0.01;
      if (spot) soloBeam.position.set(spot.x, TOP + 10.5, spot.z);
      soloBeam.material.opacity += ((spot ? 0.22 : 0) - soloBeam.material.opacity) * (1 - Math.exp(-dt * 5));

      // SHRED: 5 seconds of flames under the soloist (who floats, see
      // bandSprites.shred) and three flickering lightning bolts.
      if (shredStart === -2) shredStart = time;
      const shredSpot = shredWho && BAND_SPOTS[shredWho];
      if (shredSpot && shredStart >= 0) {
        const k = (time - shredStart) / 5;
        if (k >= 1) {
          shredWho = null;
          boltMat.opacity = 0;
        } else {
          const lift = Math.sin(Math.PI * k) * 2.2;
          for (let i = 0; i < 6; i++) {
            fire.emit(shredSpot.x + (Math.random() - 0.5) * 1.2, TOP + lift + 0.2, shredSpot.z + 0.3,
              (Math.random() - 0.5) * 1.5, -1 - Math.random() * 2, 0, FIRE[(Math.random() * FIRE.length) | 0], 0.35);
          }
          // Lightning: re-zigzag each bolt, flickering on and off.
          const flicker = Math.random() < 0.35;
          boltMat.opacity = flicker && k < 0.6 ? 1 : 0;
          if (flicker) {
            bolts.forEach((bolt, b) => {
              const pos = bolt.geometry.attributes.position;
              for (let i = 0; i < pos.count; i++) {
                const f = i / (pos.count - 1);
                pos.setXYZ(i, shredSpot.x + (b - 1) * 0.08 + (i && i < pos.count - 1 ? (Math.random() - 0.5) * 1.4 : 0),
                  TOP + 10 - f * (10 - lift - 4.5), shredSpot.z);
              }
              pos.needsUpdate = true;
            });
            pyroFlash = Math.max(pyroFlash, 0.6);
          }
        }
      }

      // The tumbleweed bounces across the front of the stage in 4.5 seconds.
      if (tumbleStart === -2) tumbleStart = time;
      if (tumbleStart >= 0) {
        const k = (time - tumbleStart) / 4.5;
        tumble.visible = k < 1;
        tumble.position.set(-11 + 22 * k, TOP + 0.75 + Math.abs(Math.sin(k * 14)) * 0.7, Z0 + 0.3);
        tumble.rotation.z = -k * 24;
        if (k >= 1) tumbleStart = -1;
      }

      // RIOT STRIKE: 0.7 s of flickering bolts from high above onto each musician.
      if (strikeStart === -2) strikeStart = time;
      if (strikeStart >= 0) {
        const k = (time - strikeStart) / 0.7;
        if (k >= 1) {
          strikeStart = -1;
          strikeMat.opacity = 0;
        } else {
          const lit = k < 0.18 || Math.random() < 0.5;
          strikeMat.opacity = lit ? 1 - k * 0.5 : 0;
          if (lit) {
            pyroFlash = Math.max(pyroFlash, 0.9);
            for (const { lines, spot, head } of strikeBolts) {
              // One zig-zag path per musician, from up in the sky to their head.
              const top = new THREE.Vector3(spot.x + (Math.random() - 0.5) * 4, TOP + 14, spot.z);
              const path = [];
              for (let i = 0; i < STRIKE_POINTS; i++) {
                const f = i / (STRIKE_POINTS - 1);
                const wobble = i && i < STRIKE_POINTS - 1 ? (Math.random() - 0.5) * 1.1 : 0;
                path.push([top.x + (spot.x - top.x) * f + wobble, top.y + (head - top.y) * f]);
              }
              lines.forEach((line, n) => {
                const pos = line.geometry.attributes.position;
                path.forEach(([x, y], i) => pos.setXYZ(i, x + (n - 1) * 0.045, y, spot.z + 0.2));
                pos.needsUpdate = true;
              });
            }
          }
        }
      }

      // RIOT EFFECTS: the stage extras fade in while their effect is on.
      effectLevel += ((riot ? 1 : 0) - effectLevel) * (1 - Math.exp(-dt * 4));
      const fxNow = effectLevel > 0.01 ? effectId : null;
      rays.visible = fxNow === 'glory';
      if (rays.visible) {
        rays.rotation.z = time * 0.15;
        rays.material.opacity = 0.55 * effectLevel;
      }
      discoBall.visible = fxNow === 'disco';
      if (discoBall.visible) {
        discoBall.rotation.y = time * 1.4;
        discoBall.position.y = TOP + 8.2 + (1 - effectLevel) * 4; // lowers in from above
      }
      const voltage = fxNow === 'voltage';
      for (const a of arcs) a.visible = voltage;
      if (voltage) {
        const lit = Math.random() < 0.6;
        arcMat.opacity = lit ? effectLevel : 0;
        if (lit) {
          [...ARC_PAIRS, ...ARC_PAIRS].forEach(([from, to], n) => {
            const A = BAND_SPOTS[from];
            const B = BAND_SPOTS[to];
            const ya = TOP + (from === 'drummer' ? 3.6 : 2.6);
            const yb = TOP + (to === 'drummer' ? 3.6 : 2.6);
            const pos = arcs[n].geometry.attributes.position;
            for (let k = 0; k < pos.count; k++) {
              const f = k / (pos.count - 1);
              const wob = k && k < pos.count - 1 ? (Math.random() - 0.5) * 0.9 : 0;
              pos.setXYZ(k, A.x + (B.x - A.x) * f, ya + (yb - ya) * f + wob, A.z + (B.z - A.z) * f + 0.3);
            }
            pos.needsUpdate = true;
          });
        }
      }
      // ZERO GRAVITY: sparkles drift up around the floating band.
      if (fxNow === 'zerog' && Math.random() < dt * 30) {
        const spots = Object.values(BAND_SPOTS);
        const sp = spots[(Math.random() * spots.length) | 0];
        fire.emit(sp.x + (Math.random() - 0.5) * 3, TOP + Math.random() * 2, sp.z + 0.5,
          (Math.random() - 0.5) * 0.4, 1 + Math.random(), 0, SPARKLE[(Math.random() * 2) | 0], 1.4);
      }

      riotSign.update(time, dt);
      pyroFlash = Math.max(0, pyroFlash - dt * 3);
      pyroLight.intensity = pyroFlash * 60;
      fire.update(dt);
      confetti.update(dt);
    },
  };
}
