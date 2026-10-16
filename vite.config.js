// vite.config.js — how the game is built.
//
// `npm run dev`   starts a local server with instant reload while you edit.
// `npm run build` produces dist/index.html: ONE self-contained file with the
//                 code, the song, the art and the chart all embedded inside it
//                 (the vite-plugin-singlefile plugin does the embedding). That
//                 single file is what gets uploaded to itch.io.
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Version info baked into the game so the menu can show exactly which build
// you're looking at: package.json version + the git commit it was built from.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
let commit = 'dev';
try { commit = execSync('git rev-parse --short HEAD').toString().trim(); } catch { /* not a git checkout */ }

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_COMMIT__: JSON.stringify(commit),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: Number.MAX_SAFE_INTEGER, // embed everything, even the MP3
    chunkSizeWarningLimit: 10000,
  },
});
