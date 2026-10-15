// vite.config.js — how the game is built.
//
// `npm run dev`   starts a local server with instant reload while you edit.
// `npm run build` produces dist/index.html: ONE self-contained file with the
//                 code, the song, the art and the chart all embedded inside it
//                 (the vite-plugin-singlefile plugin does the embedding). That
//                 single file is what gets uploaded to itch.io.
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    assetsInlineLimit: Number.MAX_SAFE_INTEGER, // embed everything, even the MP3
    chunkSizeWarningLimit: 10000,
  },
});
