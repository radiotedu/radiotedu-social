import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(scriptDir, '..')
const input = path.join(root, 'public', 'assets', 'rooms', 'library-wide.png')
const outputDir = path.join(root, 'artifacts', 'study-game', 'library-r24')
const output = path.join(outputDir, 'library-calibration-grid.png')
const metadata = await sharp(input).metadata()
const width = metadata.width ?? 0
const height = metadata.height ?? 0

if (!width || !height) throw new Error('Library image dimensions are unavailable')

const lines = []
const labels = []
for (let x = 0; x <= width; x += 50) {
  const major = x % 100 === 0
  lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${major ? '#ffffff' : '#6ee7ff'}" stroke-opacity="${major ? 0.38 : 0.16}" stroke-width="${major ? 2 : 1}"/>`)
  if (major) labels.push(`<text x="${x + 4}" y="20" fill="#ffffff" font-size="14" font-family="monospace">${x}</text>`)
}
for (let y = 0; y <= height; y += 50) {
  const major = y % 100 === 0
  lines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${major ? '#ffffff' : '#6ee7ff'}" stroke-opacity="${major ? 0.38 : 0.16}" stroke-width="${major ? 2 : 1}"/>`)
  if (major) labels.push(`<text x="4" y="${Math.max(16, y - 5)}" fill="#ffffff" font-size="14" font-family="monospace">${y}</text>`)
}

const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${lines.join('')}${labels.join('')}</svg>`)
await mkdir(outputDir, { recursive: true })
await sharp(input).composite([{ input: svg }]).png({ compressionLevel: 9 }).toFile(output)
process.stdout.write(`${output}\n`)
