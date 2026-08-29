import assert from 'node:assert/strict'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateImageRoomData } from '../scripts/generate-image-room-data.mjs'

const studyRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('packages image-room generator inputs inside the standalone Study package', async () => {
  const sourceRoot = path.join(studyRoot, 'scripts', 'image-room-source')
  const requiredInputs = [
    path.join(sourceRoot, 'app.js'),
    path.join(sourceRoot, 'data', 'library-habbo-map-mask.json'),
    path.join(studyRoot, 'src', 'rooms', 'data', 'chim-alan-courtyard-layout.json'),
    path.join(studyRoot, 'src', 'rooms', 'data', 'chim-alan-amphitheatre-layout.json'),
  ]
  const missingInputs = []

  for (const inputPath of requiredInputs) {
    try {
      await access(inputPath)
    } catch {
      missingInputs.push(path.relative(studyRoot, inputPath))
    }
  }

  assert.deepEqual(missingInputs, [])
})

test('generates layered widescreen Library, Giriş and Çim Alan navigation data', async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), 'rtjukebox-image-rooms-'))
  const outputPath = path.join(outputDir, 'image-rooms.generated.json')
  const assetOutputRoot = path.join(outputDir, 'occlusion')
  try {
    await generateImageRoomData(outputPath, assetOutputRoot)
    const data = JSON.parse(await readFile(outputPath, 'utf8'))
    const library = data.rooms.library
    const chim = data.rooms['chim-alan']
    const grass = data.rooms['grass-amphitheatre']

    assert.equal(library.image.width, 1672)
    assert.equal(library.image.height, 941)
    assert.equal(library.image.sha256, '50d1b58448c156cc6c47b823b450ffb26c43815ff6f346f27b6f1705b2d8c993')
    assert.ok(library.nodes.length >= 40)
    assert.equal(library.seats.length, 51)
    assert.ok(library.occluders.length >= 10)
    assert.match(library.occluders[0].asset.url, /^assets\/rooms\/occlusion\/library\//)
    assert.ok(library.seats.every((seat) => seat.foregroundAsset?.url))
    await access(path.join(assetOutputRoot, 'library', path.basename(library.occluders[0].asset.url)))

    const rightDeskBackSeats = ['right-mid-back-left', 'right-mid-back-mid', 'right-mid-back-right']
      .map((id) => library.seats.find((seat) => seat.id === id))
    assert.ok(rightDeskBackSeats.every(Boolean))
    const [rightBackLeft, rightBackMid, rightBackRight] = rightDeskBackSeats
    assert.ok(Math.abs((rightBackMid.sit.x - rightBackLeft.sit.x) - (rightBackRight.sit.x - rightBackMid.sit.x)) < 0.2)
    assert.equal(rightBackRight.sit.x, 73.4)

    assert.equal(chim.image.width, 1672)
    assert.equal(chim.image.height, 941)
    assert.equal(chim.image.sha256, 'ac46adbe1dd91f26b82fb402abcc86580ce9dd61c0785403578e410410ac8e0c')
    assert.equal(chim.seats.length, 3)
    assert.equal(chim.occluders.length, 0)
    assert.ok(chim.seats.every((seat) => seat.foregroundAsset?.url))
    assert.ok(chim.seats.every((seat) => seat.hitArea?.length === 4))
    assert.ok(chim.seats.every((seat) => seat.approach && seat.actorAnchor))
    assert.ok(chim.nodes.some((node) => node.id === 'central-steps-upper'))
    assert.ok(chim.nodes.some((node) => node.id === 'cafe-approach'))
    assert.deepEqual(new Set(chim.nodes.map((node) => node.z)), new Set([0, 1]))
    assert.equal(chim.actors.spark.nodeId, 'spark')
    assert.equal(chim.actors.rock.nodeId, 'rock')
    assert.equal(data.provenance, undefined)

    assert.equal(grass.image.width, 1672)
    assert.equal(grass.image.height, 941)
    assert.equal(grass.image.sha256, '84afe78fbf7fb502bea4646d402b638f4ade4e29969ed41fc6a103c2c5018ebf')
    assert.equal(grass.seats.length, 9)
    assert.equal(grass.occluders.length, 3)
    assert.ok(grass.seats.every((seat) => seat.foregroundAsset?.url))
    assert.ok(grass.seats.every((seat) => seat.hitArea?.length === 4))
    assert.ok(grass.seats.every((seat) => seat.approach && seat.actorAnchor))
    assert.deepEqual(new Set(grass.seats.map((seat) => seat.sit.z)), new Set([1, 2, 3]))
    assert.equal(grass.actors.spark.nodeId, 'spark')
    assert.equal(grass.actors.rock.nodeId, 'rock')

    for (const room of [library, chim, grass]) {
      const ids = new Set(room.nodes.map((node) => node.id))
      assert.equal(ids.size, room.nodes.length)
      assert.ok(ids.has(room.spawnNodeId))
      for (const edge of room.edges) {
        assert.ok(ids.has(edge.from), `${room.id} edge from ${edge.from}`)
        assert.ok(ids.has(edge.to), `${room.id} edge to ${edge.to}`)
        const from = room.nodes.find((node) => node.id === edge.from)
        const to = room.nodes.find((node) => node.id === edge.to)
        if (from.z !== to.z) assert.equal(edge.kind, 'stair')
      }
    }
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
})
