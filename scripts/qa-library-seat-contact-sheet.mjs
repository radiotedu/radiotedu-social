import { readdir } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

const source = process.argv[2]
const output = process.argv[3]
if (!source || !output) throw new Error('Usage: node qa-library-seat-contact-sheet.mjs <source-dir> <output.png>')

const files = (await readdir(source))
  .filter((file) => /^library--.+\.png$/i.test(file))
  .sort((left, right) => left.localeCompare(right))
if (files.length === 0) throw new Error('No Library seat screenshots found')

const cellWidth = 360
const cellHeight = 230
const columns = 4
const rows = Math.ceil(files.length / columns)
const composites = []
for (const [index, file] of files.entries()) {
  const image = await sharp(path.join(source, file))
    .resize(cellWidth, cellHeight - 24, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer()
  const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cellWidth}" height="24"><rect width="100%" height="100%" fill="#0a1417"/><text x="10" y="17" fill="#b7f7dc" font-family="Segoe UI, sans-serif" font-size="12">${file.replace(/^library--|\.png$/gi, '')}</text></svg>`)
  const left = (index % columns) * cellWidth
  const top = Math.floor(index / columns) * cellHeight
  composites.push({ input: image, left, top }, { input: label, left, top: top + cellHeight - 24 })
}

await sharp({
  create: { width: columns * cellWidth, height: rows * cellHeight, channels: 4, background: '#071013' },
}).composite(composites).png({ compressionLevel: 9 }).toFile(output)
process.stdout.write(`${output}\n`)
