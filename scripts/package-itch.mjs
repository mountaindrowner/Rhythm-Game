// package-itch.mjs — wraps dist/index.html into the ZIP that itch.io expects
// (index.html must sit at the root of the ZIP, not inside a folder).
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { zipSync } from 'fflate';

const html = readFileSync('dist/index.html');
const zip = zipSync({ 'index.html': html }, { level: 9 });
writeFileSync('dist/burn-bright-itch.zip', zip);

const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';
console.log(`dist/index.html          ${mb(statSync('dist/index.html').size)}`);
console.log(`dist/burn-bright-itch.zip ${mb(zip.length)}  <- upload this to itch.io`);
