// Generates PWA icon PNGs using only Node.js built-ins (no dependencies).
import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return ((crc ^ 0xffffffff) >>> 0);
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  return Buffer.concat([u32(data.length), t, data, u32(crc32(Buffer.concat([t, data])))]);
}

function makePNG(size, draw) {
  const px = new Uint8ClampedArray(size * size * 4); // RGBA
  draw(px, size);

  const rows = [];
  for (let y = 0; y < size; y++) {
    rows.push(0); // PNG filter byte: None
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      rows.push(px[i], px[i + 1], px[i + 2], px[i + 3]);
    }
  }

  const raw = Buffer.from(rows);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = chunk('IHDR', Buffer.concat([u32(size), u32(size), Buffer.from([8, 6, 0, 0, 0])]));
  const idat = chunk('IDAT', deflateSync(raw, { level: 9 }));
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

function setPixel(px, size, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const i = (y * size + x) * 4;
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
}

function fillRect(px, size, x1, y1, x2, y2, r, g, b, a = 255) {
  for (let y = Math.max(0, y1); y < Math.min(size, y2); y++)
    for (let x = Math.max(0, x1); x < Math.min(size, x2); x++)
      setPixel(px, size, x, y, r, g, b, a);
}

function drawIcon(px, S) {
  const rad = Math.round(S * 0.22); // corner radius

  // Rounded background: #0f172a (15, 23, 42)
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const cx = Math.min(x, S - 1 - x);
      const cy = Math.min(y, S - 1 - y);
      if (cx < rad && cy < rad) {
        const dx = rad - cx - 1;
        const dy = rad - cy - 1;
        if (dx * dx + dy * dy > rad * rad) { setPixel(px, S, x, y, 0, 0, 0, 0); continue; }
      }
      setPixel(px, S, x, y, 15, 23, 42);
    }
  }

  // Cross: vertical bar (center-ish, top-of-cross higher than center)
  const cw = Math.round(S * 0.12); // cross bar thickness
  const cx = Math.round(S / 2 - cw / 2);
  const vTop = Math.round(S * 0.18);
  const vBot = Math.round(S * 0.82);
  fillRect(px, S, cx, vTop, cx + cw, vBot, 255, 255, 255);

  // Horizontal bar (slightly above center)
  const hh = Math.round(S * 0.12);
  const hy = Math.round(S * 0.36 - hh / 2);
  const hLeft = Math.round(S * 0.22);
  const hRight = Math.round(S * 0.78);
  fillRect(px, S, hLeft, hy, hRight, hy + hh, 255, 255, 255);

  // Subtle glow/shine at cross intersection (slightly lighter center)
  const glowR = Math.round(S * 0.07);
  const gcx = Math.round(S / 2);
  const gcy = Math.round(S * 0.36);
  for (let y = gcy - glowR; y <= gcy + glowR; y++) {
    for (let x = gcx - glowR; x <= gcx + glowR; x++) {
      const d2 = (x - gcx) ** 2 + (y - gcy) ** 2;
      if (d2 <= glowR * glowR) {
        const i = (Math.max(0, Math.min(S - 1, y)) * S + Math.max(0, Math.min(S - 1, x))) * 4;
        if (px[i + 3] === 255) {
          px[i] = Math.min(255, px[i] + 20);
          px[i + 1] = Math.min(255, px[i + 1] + 20);
          px[i + 2] = Math.min(255, px[i + 2] + 20);
        }
      }
    }
  }
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icon-192.png', makePNG(192, drawIcon));
writeFileSync('public/icon-512.png', makePNG(512, drawIcon));
writeFileSync('public/apple-touch-icon.png', makePNG(180, drawIcon));
console.log('Icons written to public/');
