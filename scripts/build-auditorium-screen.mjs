import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOGO = path.join(ROOT, 'public', 'assets', 'brand', 'radiotedu-logo-white.png')
const OUTPUT = path.join(ROOT, 'public', 'assets', 'rooms', 'auditorium-radiotedu-screen-r1.png')
const logo = (await fs.readFile(LOGO)).toString('base64')

// The local 284 x 190 screen is projected onto the auditorium's sloped rear
// wall with an affine matrix. Keeping the overlay at source-room resolution
// makes it follow the room camera exactly on desktop and mobile.
const svg = `
<svg width="1672" height="941" viewBox="0 0 1672 941" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#07121e"/>
      <stop offset="0.58" stop-color="#02070d"/>
      <stop offset="1" stop-color="#0b1119"/>
    </linearGradient>
    <linearGradient id="live" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ef1b2d"/>
      <stop offset="1" stop-color="#ff5260"/>
    </linearGradient>
  </defs>
  <g transform="matrix(1 -0.197 0 1 353 176)">
    <rect width="284" height="190" rx="3" fill="#010307" stroke="#342d25" stroke-width="8"/>
    <rect x="8" y="8" width="268" height="174" rx="2" fill="url(#screen)" stroke="#477789" stroke-width="2"/>
    <g opacity="0.14" stroke="#9be7f6" stroke-width="1">
      <path d="M14 34H270M14 58H270M14 82H270M14 106H270M14 130H270M14 154H270"/>
    </g>
    <image href="data:image/png;base64,${logo}" x="25" y="63" width="234" height="42" preserveAspectRatio="xMidYMid meet"/>
    <rect x="25" y="121" width="42" height="3" rx="1.5" fill="url(#live)"/>
    <text x="73" y="126" fill="#f6f8fb" font-family="Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="2">TEDU CAMPUS</text>
    <circle cx="25" cy="151" r="4" fill="#ef1b2d"/>
    <text x="36" y="155" fill="#cbe5ec" font-family="Arial, sans-serif" font-size="8" font-weight="700" letter-spacing="1.5">STUDENT RADIO · LIVE</text>
    <path d="M16 17h18M16 17v12M268 17h-18M268 17v12M16 173h18M16 173v-12M268 173h-18M268 173v-12" fill="none" stroke="#ef1b2d" stroke-width="2"/>
  </g>
</svg>`

await sharp({
  create: { width: 1672, height: 941, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: Buffer.from(svg) }])
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(OUTPUT)

console.log(OUTPUT)
