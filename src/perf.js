// =============================================================================
// perf.js — keeps the game smooth on slower phones.
//
// Smoothness in a rhythm game matters more than sharpness: a steady 60 frames
// per second makes notes glide; dropped frames make them stutter. So this
// watches how long each frame takes and, if the phone is struggling, renders
// at a slightly lower resolution (fewer pixels to draw). When there's spare
// time again, it raises the resolution back up.
//
// Add ?fps to the page address to see the numbers in the corner.
// =============================================================================
const TARGET_MS = 1000 / 58;   // aim for ~60 fps
const SLOW_MS = 1000 / 45;     // slower than ~45 fps on average = struggling

export function createPerfMonitor(world) {
  const maxRatio = Math.min(window.devicePixelRatio || 1, 2);
  const minRatio = Math.min(1, maxRatio);
  let ratio = maxRatio;
  let windowMs = 0;
  let frames = 0;
  let worst = 0;
  let calmSeconds = 0;

  const show = new URLSearchParams(location.search).has('fps');
  let label = null;
  if (show) {
    label = document.createElement('div');
    label.style.cssText = 'position:absolute;left:6px;bottom:6px;z-index:9;font:11px monospace;'
      + 'color:#9f9;background:#000a;padding:3px 6px;border-radius:6px;pointer-events:none;white-space:pre';
    document.getElementById('phone').append(label);
  }

  return {
    /** Call once per frame with the real frame time in milliseconds. */
    frame(ms) {
      windowMs += ms;
      frames += 1;
      worst = Math.max(worst, ms);
      if (windowMs < 1000) return; // decide once per second

      const avg = windowMs / frames;
      if (avg > SLOW_MS && ratio > minRatio) {
        ratio = Math.max(minRatio, ratio - 0.25);
        world.setPixelRatio(ratio);
        calmSeconds = 0;
      } else if (avg < TARGET_MS) {
        calmSeconds += 1;
        if (calmSeconds >= 5 && ratio < maxRatio) {
          ratio = Math.min(maxRatio, ratio + 0.25);
          world.setPixelRatio(ratio);
          calmSeconds = 0;
        }
      } else {
        calmSeconds = 0;
      }
      if (label) {
        const info = world.renderer.info.render;
        label.textContent = `${Math.round(1000 / avg)} fps  avg ${avg.toFixed(1)}ms  worst ${worst.toFixed(1)}ms\n`
          + `res x${ratio.toFixed(2)}  draws ${info.calls}`;
      }
      windowMs = 0;
      frames = 0;
      worst = 0;
    },
  };
}
