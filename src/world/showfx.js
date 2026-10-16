// =============================================================================
// showfx.js — the big concert effects that make choruses feel huge:
//   * PYRO: fire jets at the front of the stage, on the downbeat of each bar
//   * LASERS: beams fanning out over the crowd
//   * CONFETTI: a burst from the truss when a chorus starts
//   * CROWD LIGHTS: phone lights swaying in the air (choruses and the bridge)
//   * STROBE: a quick white flash when a chorus hits (softer with
//     Settings → Reduce flashing)
// =============================================================================
import * as THREE from 'three';
import { WORLD } from '../config.js';
import { Particles, softDot } from './effects.js';
import { moodFor } from './stage.js';

const Z0 = WORLD.stageZ;
const TOP = WORLD.stageHeight;
const PYRO_X = [-8.4, -3.3, 3.3, 8.4];

export function createShowFx(scene, fans, flashEl) {
  const fire = new Particles(scene, { max: 600, size: 0.42, gravity: -1, drag: 2 });
  const confetti = new Particles(scene, { max: 500, size: 0.16, additive: false, gravity: 1.6, drag: 1.2, square: true });
  const FIRE = ['#c41f0a', '#e8460f', '#f07a14', '#d89a20'].map((c) => new THREE.Color(c));
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
    },

    /**
     * @param {number} time     steady clock (seconds)
     * @param {number} beat     beat position in the song
     * @param {string} section  current section name
     * @param {boolean} live    a song is playing
     * @param {number} dt
     */
    update(time, beat, section, live, dt) {
      const big = live && (section.includes('CHORUS') || section === 'OUTRO');
      const final = section.startsWith('FINAL') || section === 'OUTRO';

      // Pyro on each bar's downbeat during choruses (every half bar in the finale).
      const bar = Math.floor(beat / 4);
      const half = Math.floor(beat / 2);
      if (big && bar !== lastBar && lastBar >= 0) pyro(bar % 2 ? [0, 3] : [1, 2]);
      else if (big && final && half !== lastHalf && half % 2 === 1) pyro(half % 4 === 1 ? [0, 3] : [1, 2]);
      lastBar = bar;
      lastHalf = half;

      // Lasers fade in for choruses (and a little for builds).
      const laserGoal = big ? 0.5 : live && section.includes('BUILD') ? 0.2 : 0;
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

      pyroFlash = Math.max(0, pyroFlash - dt * 3);
      pyroLight.intensity = pyroFlash * 60;
      fire.update(dt);
      confetti.update(dt);
    },
  };
}
