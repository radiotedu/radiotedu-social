import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const wordmarkPath = new URL('../public/assets/brand/radiotedu-logo-white.png', import.meta.url)

describe('RadioTEDU Social wordmark', () => {
  it('ships the official PNG wordmark as a same-origin asset', async () => {
    const image = await readFile(wordmarkPath)

    expect(image.byteLength).toBeGreaterThan(40_000)
    expect([...image.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  })

  it('renders the wordmark in boot, home, gate and in-world surfaces', async () => {
    const [index, main] = await Promise.all([
      readFile(new URL('../index.html', import.meta.url), 'utf8'),
      readFile(new URL('../src/main.ts', import.meta.url), 'utf8'),
    ])
    const asset = 'assets/brand/radiotedu-logo-white.png'

    expect(index).toContain(asset)
    expect(main.split(asset)).toHaveLength(5)
  })
})
