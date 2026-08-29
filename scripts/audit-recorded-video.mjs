import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'

import { chromium } from '@playwright/test'

const files = process.argv.slice(2)
if (files.length === 0 || files.some((file) => !existsSync(file))) {
  console.error('Usage: node scripts/audit-recorded-video.mjs <video.webm> [...]')
  process.exit(2)
}

const server = createServer((request, response) => {
  const playerMatch = request.url?.match(/^\/player\/(\d+)$/)
  if (playerMatch) {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    response.end(`<video muted playsinline preload="auto" src="/video/${playerMatch[1]}"></video>`)
    return
  }
  const videoMatch = request.url?.match(/^\/video\/(\d+)$/)
  const file = videoMatch ? files[Number(videoMatch[1])] : undefined
  if (!file) {
    response.writeHead(404).end()
    return
  }
  const size = statSync(file).size
  const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
  const start = range ? Number(range[1]) : 0
  const end = range?.[2] ? Math.min(size - 1, Number(range[2])) : size - 1
  const headers = {
    'Accept-Ranges': 'bytes',
    'Content-Length': String(end - start + 1),
    'Content-Type': 'video/webm',
  }
  if (range) headers['Content-Range'] = `bytes ${start}-${end}/${size}`
  response.writeHead(range ? 206 : 200, headers)
  createReadStream(file, { start, end }).pipe(response)
})
await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})
const address = server.address()
if (!address || typeof address === 'string') throw new Error('QA video server did not bind')

const browser = await chromium.launch({ headless: true })

try {
  for (const [fileIndex, file] of files.entries()) {
    const page = await browser.newPage({ viewport: { width: 320, height: 180 } })
    await page.goto(`http://127.0.0.1:${address.port}/player/${fileIndex}`, { waitUntil: 'load' })
    const result = await page.evaluate(async () => {
      const video = document.querySelector('video')
      if (!(video instanceof HTMLVideoElement)) throw new Error('Browser video element was not created')
      video.muted = true
      video.playbackRate = 1
      await new Promise((resolve, reject) => {
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) resolve(undefined)
        else {
          video.addEventListener('loadedmetadata', () => resolve(undefined), { once: true })
          video.addEventListener('error', () => reject(video.error ?? new Error('Video metadata failed')), { once: true })
        }
      })

      const canvas = document.createElement('canvas')
      canvas.width = 96
      canvas.height = 54
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('Canvas context unavailable')

      const sampleRate = 25
      let frames = 0
      let previousPixels = null
      let maxExactRepeat = 0
      let exactRepeatFrames = 0
      let blackFrames = 0
      let lowestLuma = Number.POSITIVE_INFINITY
      video.pause()

      const seek = async (time) => {
        if (Math.abs(video.currentTime - time) < 0.0005) return
        await new Promise((resolve, reject) => {
          const done = () => {
            video.removeEventListener('error', failed)
            resolve(undefined)
          }
          const failed = () => {
            video.removeEventListener('seeked', done)
            reject(video.error ?? new Error('Video seek failed'))
          }
          video.addEventListener('seeked', done, { once: true })
          video.addEventListener('error', failed, { once: true })
          video.currentTime = time
        })
      }

      const totalSamples = Math.max(1, Math.floor(video.duration * sampleRate))
      for (let frame = 0; frame <= totalSamples; frame += 1) {
        const mediaTime = Math.min(Math.max(0, video.duration - 0.001), frame / sampleRate)
        await seek(mediaTime)
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
        let luma = 0
        for (let index = 0; index < pixels.length; index += 4) {
          luma += (pixels[index] * 0.2126) + (pixels[index + 1] * 0.7152) + (pixels[index + 2] * 0.0722)
        }
        const averageLuma = luma / (pixels.length / 4)
        lowestLuma = Math.min(lowestLuma, averageLuma)
        if (averageLuma < 2) blackFrames += 1

        let exact = previousPixels !== null
        if (previousPixels) {
          for (let index = 0; index < pixels.length; index += 1) {
            if (pixels[index] !== previousPixels[index]) {
              exact = false
              break
            }
          }
        }
        if (exact) {
          exactRepeatFrames += 1
          maxExactRepeat = Math.max(maxExactRepeat, exactRepeatFrames / sampleRate)
        } else {
          exactRepeatFrames = 0
        }

        previousPixels = new Uint8ClampedArray(pixels)
        frames += 1
      }
      return {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        sampleRate,
        frames,
        maxExactRepeat,
        blackFrames,
        lowestLuma,
      }
    })
    console.log(JSON.stringify({ file, ...result }))
    await page.close()
  }
} finally {
  await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
