#!/usr/bin/env node
'use strict';

// Generates a QR code PNG for each event into public/qr-images/.
// Runs as part of the build (prebuild script) so the images land in dist/.
// The og:image for each /slug/qr page points to /qr-images/{slug}.png.

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://events.npole.org';
const eventsDir = path.join(__dirname, '../src/events');
const outputDir = path.join(__dirname, '../public/qr-images');

fs.mkdirSync(outputDir, { recursive: true });

const dirs = fs.readdirSync(eventsDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

let generated = 0;

for (const dir of dirs) {
  const configPath = path.join(eventsDir, dir, 'config.ts');
  if (!fs.existsSync(configPath)) continue;

  const content = fs.readFileSync(configPath, 'utf8');
  const match = content.match(/slug:\s*['"`]([^'"`]+)['"`]/);
  if (!match) continue;

  const slug = match[1];
  const url = `${BASE_URL}/${slug}`;
  const outPath = path.join(outputDir, `${slug}.png`);

  QRCode.toFile(outPath, url, { width: 512, margin: 2 }, err => {
    if (err) {
      console.error(`  ✗ QR failed for ${slug}:`, err.message);
    } else {
      console.log(`  ✓ QR generated: ${slug}.png`);
    }
  });

  generated++;
}

if (generated === 0) {
  console.log('No event configs found — no QR images generated.');
} else {
  console.log(`Generating QR images for ${generated} event(s)…`);
}
