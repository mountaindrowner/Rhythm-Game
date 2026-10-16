// =============================================================================
// crowd.js — the fans on both sides of the highway: pixel-art people seen
// from behind (PixelLab art, packed by scripts/pixellab/pack_crowd.py).
//
// SPEED TRICK ("instancing"): all ~140 fans are ONE mesh drawn in ONE go.
// Each copy (instance) gets its own position, size, color tint and — via a
// small shader tweak — its own animation frame from the shared sprite sheet.
//
// BEHAVIOUR: in calm parts of the song fans mostly stand and bob; as the music
// gets bigger (and your combo grows) more of them break into the full
// jump-and-cheer animation, timed to the beat.
// =============================================================================
import * as THREE from 'three';
import sheet from '../../assets/art/crowd/crowd.json';
import crowdUrl from '../../assets/art/crowd/crowd.png';

const FAN_HEIGHT = 2.5; // world units for the tallest fan (band members are 5.4: they're the stars)

export function createCrowd(scene, fans) {
  const PX = FAN_HEIGHT / sheet.height;
  const [cw, ch] = sheet.cell;
  const geo = new THREE.PlaneGeometry(cw * PX, ch * PX);
  geo.translate(0, sheet.footY * PX - (ch * PX) / 2, 0); // feet at y = 0

  const tex = new THREE.TextureLoader().load(crowdUrl);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.repeat.set(1 / sheet.columns, 1 / sheet.rows);

  // Per-fan sprite-sheet cell, as a UV offset. The shader adds it to the UVs.
  const cellOffset = new THREE.InstancedBufferAttribute(new Float32Array(fans.length * 2), 2);
  cellOffset.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aCell', cellOffset);

  const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5 });
  // Shader tweak: shift each instance's texture coordinates to its own cell.
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aCell;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv += aCell;');
  };

  const mesh = new THREE.InstancedMesh(geo, mat, fans.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  scene.add(mesh);

  // Fans further back are dimmer (they're out of the light).
  const color = new THREE.Color();
  const rows = sheet.rows;
  fans.forEach((f, i) => {
    f.row = f.look % rows;
    const depth = Math.min(1, Math.max(0, (-f.z - 7) / 10)); // 0 near you, 1 by the stage
    color.setRGB(1, 1, 1).multiplyScalar(0.9 - depth * 0.3);
    mesh.setColorAt(i, color);
  });

  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();

  function setCell(i, row, col) {
    cellOffset.setXY(i, col / sheet.columns, 1 - (row + 1) / rows);
  }

  return {
    mesh,
    /**
     * @param {number} beat       beat position in the song
     * @param {number} intensity  0..~1.3 how big the music is (stage.intensity)
     */
    update(beat, intensity) {
      for (let i = 0; i < fans.length; i++) {
        const f = fans[i];
        const frames = sheet.fans[f.row].frames;
        // Is this fan hyped enough to really cheer right now?
        const cheering = frames > 1 && intensity > 0.45 + f.jumpy * 0.6;
        const b = beat + f.phase / Math.PI;
        let col = 0;
        let lift = 0;
        if (cheering) {
          // Full cheer loop: one loop every 2 beats, offset per fan.
          col = 1 + Math.floor((((b / 2) % 1) + 1) % 1 * (frames - 1));
        } else {
          // Standing: a small bob on the beat.
          lift = Math.max(0, Math.sin(b * Math.PI)) * 0.08 * intensity;
        }
        setCell(i, f.row, col);
        pos.set(f.x, lift, f.z);
        scl.set(f.s, f.s, 1);
        m.compose(pos, quat, scl);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
      cellOffset.needsUpdate = true;
    },
  };
}
