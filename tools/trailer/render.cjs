#!/usr/bin/env node
// node tools/trailer/render.cjs --clip <id> [--out <mappe>] [--test] [--from a --to b]   (bilder: 0-baserte indekser; standard utmappe env TRAILER_FRAMES)
const fs = require('fs'), path = require('path');
const { renderClip } = require('./render_lib.cjs');
const a = process.argv.slice(2), get = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
const id = get('--clip');
if (!id) { console.error('Bruk: node tools/trailer/render.cjs --clip <id> [--out <mappe>] [--test] [--from a --to b]'); process.exit(2); }
const f = path.join(__dirname, 'shots', id + '.cjs');
if (!fs.existsSync(f)) { console.error('Finner ikke klippmodul: ' + f); process.exit(2); }
renderClip(require(f), { out: get('--out'), test: a.includes('--test'), from: get('--from') != null ? +get('--from') : undefined, to: get('--to') != null ? +get('--to') : undefined })
  .catch((e) => { console.error(e); process.exit(1); });
