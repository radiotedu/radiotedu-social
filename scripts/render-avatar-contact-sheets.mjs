import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import { ACTION_FRAMES, DIRECTIONS, FRAME_HEIGHT, FRAME_WIDTH } from './generate-engine-avatar-assets.mjs'

const assetDir = path.resolve('public', 'assets', 'avatars', 'engine-proof')
const outputDir = path.resolve(process.argv[2] ?? path.join('..', 'artifacts', 'study-game', 'avatar-contact-sheets'))
const appearance = Object.freeze({
  bottom: 'black-cargos',
  hat: 'bucket-hat',
  shoes: 'sneakers',
  top: 'radio-hoodie',
})

const filesFor = (action) => [
  `body-${action}.png`,
  `skin-${action}.png`,
  `hair-${action}.png`,
  `top-${appearance.top}-${action}.png`,
  `bottom-${appearance.bottom}-${action}.png`,
  `shoes-${appearance.shoes}-${action}.png`,
  `hat-${appearance.hat}-${action}.png`,
]

await mkdir(outputDir, { recursive: true })

for (const action of ['idle', 'walk', 'sit', 'stand']) {
  const width = FRAME_WIDTH * ACTION_FRAMES[action]
  const height = FRAME_HEIGHT * DIRECTIONS.length
  const composed = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(filesFor(action).map((file) => ({ input: path.join(assetDir, file) })))
    .png()
    .toBuffer()

  await sharp(composed)
    .resize({ width: width * 4, height: height * 4, kernel: 'nearest' })
    .png()
    .toFile(path.join(outputDir, `${action}-all-directions-4x.png`))
}

console.log(outputDir)
