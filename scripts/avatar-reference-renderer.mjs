const INK = '#10242a'
const SKIN = '#efaa79'
const SKIN_SHADOW = '#c97755'
const SKIN_LIGHT = '#ffd0a1'
const CHEEK = '#d98273'
const HAIR = '#512f23'
const HAIR_SHADOW = '#351d18'
const HAIR_LIGHT = '#774632'

function q(value) {
  return Math.round(value * 10) / 10
}

function rect(x, y, width, height, fill, stroke = 'none', strokeWidth = 0, radius = 0) {
  return `<rect x="${q(x)}" y="${q(y)}" width="${q(width)}" height="${q(height)}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
}

function ellipse(cx, cy, rx, ry, fill, stroke = 'none', strokeWidth = 0) {
  return `<ellipse cx="${q(cx)}" cy="${q(cy)}" rx="${q(rx)}" ry="${q(ry)}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
}

function polygon(points, fill, stroke = 'none', strokeWidth = 0) {
  const value = points.map(([x, y]) => `${q(x)},${q(y)}`).join(' ')
  return `<polygon points="${value}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`
}

function line(x1, y1, x2, y2, stroke, width = 1) {
  return `<line x1="${q(x1)}" y1="${q(y1)}" x2="${q(x2)}" y2="${q(y2)}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"/>`
}

function pathShape(d, fill = 'none', stroke = 'none', strokeWidth = 0) {
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
}

function direction(p) {
  const side = Math.abs(p.dx) > 0.9
  const diagonal = Math.abs(p.dx) > 0.2 && !side
  const front = p.dy > 0.2
  const rear = p.dy < -0.2
  const sign = p.dx === 0 ? 1 : Math.sign(p.dx)
  return { diagonal, front, rear, side, sign }
}

function geometry(p) {
  const d = direction(p)
  const center = 32 + p.dx * 1.5
  const headCenter = center + p.dx * 1.25
  const torsoWidth = d.side ? 21 : d.diagonal ? 25.5 : 28
  const torsoLeft = center - torsoWidth / 2
  const torsoTop = p.torsoY - 1
  const torsoBottom = p.hipY + 2
  return { ...d, center, headCenter, torsoBottom, torsoLeft, torsoTop, torsoWidth }
}

function palette(variant) {
  if (variant === 'varsity-jacket') {
    return {
      accent: '#f2dfc4',
      base: '#8f2438',
      cuff: '#f2dfc4',
      light: '#c84a5d',
      shade: '#5b1727',
      sleeve: '#e6d4b9',
      sleeveShade: '#bca98f',
    }
  }
  if (variant === 'radiotedu-tee') {
    return {
      accent: '#ed1c2d',
      base: '#f3eee4',
      cuff: '#d3c8b8',
      light: '#ffffff',
      shade: '#c9c0b2',
      sleeve: '#f3eee4',
      sleeveShade: '#c9c0b2',
    }
  }
  return {
    accent: '#eefaf8',
    base: '#168c91',
    cuff: '#083f49',
    light: '#32afb0',
    shade: '#0a5962',
    sleeve: '#168c91',
    sleeveShade: '#0a5962',
  }
}

function bodyLayer(p) {
  const g = geometry(p)
  const legY = p.hipY + 1
  const seatedForward = p.dx * p.seated * 9
  const torso = polygon([
    [g.torsoLeft + 4, g.torsoTop - 2],
    [g.torsoLeft + g.torsoWidth - 4, g.torsoTop - 2],
    [g.torsoLeft + g.torsoWidth + 1, g.torsoTop + 5],
    [g.torsoLeft + g.torsoWidth, g.torsoBottom],
    [g.torsoLeft, g.torsoBottom],
    [g.torsoLeft - 1, g.torsoTop + 5],
  ], INK, INK, 1)
  const neck = rect(g.headCenter - 4, p.headY + 19, 8, 9, INK, INK, 1, 2)

  if (p.seated > 0.5) {
    const left = polygon([
      [g.center - 12, legY],
      [g.center - 1, legY],
      [g.center + seatedForward + 2, legY + 9],
      [g.center + seatedForward - 1, legY + 15],
      [g.center - 11, legY + 9],
    ], INK)
    const right = polygon([
      [g.center + 1, legY],
      [g.center + 12, legY],
      [g.center + seatedForward + 12, legY + 10],
      [g.center + seatedForward + 7, legY + 16],
      [g.center + 1, legY + 9],
    ], INK)
    return `${neck}${torso}${left}${right}`
  }

  const walk = p.swing * 0.75
  const farLeg = polygon([
    [g.center - 12, legY], [g.center - 1, legY],
    [g.center - 2, legY + 23 + walk], [g.center - 11, legY + 23 + walk],
  ], INK, INK, 1)
  const nearLeg = polygon([
    [g.center + 1, legY], [g.center + 12, legY],
    [g.center + 11, legY + 23 - walk], [g.center + 2, legY + 23 - walk],
  ], INK, INK, 1)
  return `${neck}${torso}${farLeg}${nearLeg}`
}

function skinLayer(p) {
  const g = geometry(p)
  const headWidth = g.side ? 19 : g.diagonal ? 22 : 24
  const halfHead = headWidth / 2
  const earY = p.headY + 13
  const ears = g.side
    ? ellipse(g.headCenter - g.sign * (halfHead - 1), earY, 2.2, 3.4, SKIN_SHADOW, INK, 1)
    : `${ellipse(g.headCenter - halfHead + 0.8, earY, 2.2, 3.4, SKIN_SHADOW, INK, 1)}${ellipse(g.headCenter + halfHead - 0.8, earY, 2.2, 3.4, SKIN_SHADOW, INK, 1)}`
  const head = ellipse(g.headCenter, p.headY + 12, halfHead, 13, SKIN, INK, 1.5)
  const jawShade = g.rear
    ? pathShape(`M ${q(g.headCenter - halfHead + 3)} ${q(p.headY + 18)} Q ${q(g.headCenter)} ${q(p.headY + 27)} ${q(g.headCenter + halfHead - 3)} ${q(p.headY + 18)}`, 'none', SKIN_SHADOW, 1.4)
    : pathShape(`M ${q(g.headCenter + (g.sign > 0 ? 3 : -halfHead + 3))} ${q(p.headY + 22)} Q ${q(g.headCenter + g.sign * 3)} ${q(p.headY + 25)} ${q(g.headCenter + g.sign * (halfHead - 2))} ${q(p.headY + 18)}`, 'none', SKIN_SHADOW, 1.2)
  const templeLight = g.rear
    ? ''
    : ellipse(g.headCenter - g.sign * (g.side ? 2 : 6), p.headY + 7, g.side ? 1.2 : 1.8, 2.5, SKIN_LIGHT)

  let face = ''
  if (!g.rear) {
    const look = g.side ? g.sign * 4.5 : g.diagonal ? g.sign * 2.1 : 0
    if (g.side) {
      face += p.blink
        ? line(g.headCenter + look - 1.7, p.headY + 12, g.headCenter + look + 1.7, p.headY + 12, INK, 1.2)
        : `${ellipse(g.headCenter + look, p.headY + 11.5, 2.1, 2.5, '#fffaf0', INK, 0.8)}${ellipse(g.headCenter + look + g.sign * 0.5, p.headY + 11.8, 1.05, 1.4, '#3b2b24')}${ellipse(g.headCenter + look + g.sign * 0.2, p.headY + 11.3, 0.35, 0.45, '#ffffff')}`
      face += line(g.headCenter + look - g.sign * 1.8, p.headY + 7.8, g.headCenter + look + g.sign * 1.5, p.headY + 7.2, HAIR_SHADOW, 1.2)
      face += line(g.headCenter + look + g.sign * 1.4, p.headY + 14.2, g.headCenter + look + g.sign * 2.5, p.headY + 14.8, SKIN_SHADOW, 0.9)
      face += pathShape(`M ${q(g.headCenter + look - g.sign * 0.4)} ${q(p.headY + 18)} Q ${q(g.headCenter + look + g.sign * 1.4)} ${q(p.headY + 19.2)} ${q(g.headCenter + look + g.sign * 3)} ${q(p.headY + 17.2)}`, 'none', '#8a3f3a', 1)
    } else {
      const leftEye = g.headCenter - 4.4 + look
      const rightEye = g.headCenter + 4.4 + look
      face += p.blink
        ? `${line(leftEye - 1.8, p.headY + 12, leftEye + 1.8, p.headY + 12, INK, 1.2)}${line(rightEye - 1.8, p.headY + 12, rightEye + 1.8, p.headY + 12, INK, 1.2)}`
        : `${ellipse(leftEye, p.headY + 11.5, 2.4, 2.8, '#fffaf0', INK, 0.8)}${ellipse(rightEye, p.headY + 11.5, 2.4, 2.8, '#fffaf0', INK, 0.8)}${ellipse(leftEye + g.sign * 0.35, p.headY + 11.8, 1.05, 1.45, '#3b2b24')}${ellipse(rightEye + g.sign * 0.35, p.headY + 11.8, 1.05, 1.45, '#3b2b24')}${ellipse(leftEye + 0.05, p.headY + 11.2, 0.35, 0.45, '#ffffff')}${ellipse(rightEye + 0.05, p.headY + 11.2, 0.35, 0.45, '#ffffff')}`
      face += `${line(leftEye - 1.8, p.headY + 7.7, leftEye + 1.7, p.headY + 7.2, HAIR_SHADOW, 1.2)}${line(rightEye - 1.7, p.headY + 7.2, rightEye + 1.8, p.headY + 7.7, HAIR_SHADOW, 1.2)}`
      face += line(g.headCenter + look, p.headY + 14, g.headCenter + look + g.sign * 0.8, p.headY + 15.4, SKIN_SHADOW, 0.9)
      face += pathShape(`M ${q(g.headCenter - 2.2 + look)} ${q(p.headY + 18)} Q ${q(g.headCenter + look)} ${q(p.headY + 19.5)} ${q(g.headCenter + 2.3 + look)} ${q(p.headY + 18)}`, 'none', '#8a3f3a', 1)
      face += `${ellipse(g.headCenter - 8 + look, p.headY + 16.2, 1.4, 0.7, CHEEK)}${ellipse(g.headCenter + 8 + look, p.headY + 16.2, 1.4, 0.7, CHEEK)}`
    }
  }

  const armSwing = p.action === 'walk' ? p.swing * 0.8 : 0
  if (p.seated > 0.5) {
    const handY = p.torsoY + 18
    const spread = g.side ? 3 : 6.5
    const forward = p.dx * 3
    const arms = `${polygon([[g.torsoLeft + 3, p.torsoY + 5], [g.torsoLeft - 1, p.torsoY + 11], [g.center - spread + forward, handY + p.typing], [g.center - spread + 4 + forward, handY + 3 + p.typing]], SKIN_SHADOW, INK, 1)}${polygon([[g.torsoLeft + g.torsoWidth - 3, p.torsoY + 5], [g.torsoLeft + g.torsoWidth + 1, p.torsoY + 11], [g.center + spread + forward, handY - p.typing], [g.center + spread - 4 + forward, handY + 3 - p.typing]], SKIN, INK, 1)}`
    const hands = `${ellipse(g.center - spread + 2 + forward, handY + 2 + p.typing, 3, 2.8, SKIN_SHADOW, INK, 1)}${ellipse(g.center + spread - 2 + forward, handY + 2 - p.typing, 3, 2.8, SKIN, INK, 1)}${line(g.center + spread - 4 + forward, handY + 1 - p.typing, g.center + spread + forward, handY + 1 - p.typing, SKIN_LIGHT, 0.8)}`
    return `${ears}${head}${jawShade}${templeLight}${face}${arms}${hands}`
  }
  const handY = p.hipY - 4
  const arms = `${polygon([[g.torsoLeft + 3, p.torsoY + 5], [g.torsoLeft - 3, p.torsoY + 10], [g.torsoLeft - 2, handY - armSwing], [g.torsoLeft + 3, handY - armSwing]], SKIN_SHADOW, INK, 1)}${polygon([[g.torsoLeft + g.torsoWidth - 3, p.torsoY + 5], [g.torsoLeft + g.torsoWidth + 3, p.torsoY + 10], [g.torsoLeft + g.torsoWidth + 2, handY + armSwing], [g.torsoLeft + g.torsoWidth - 3, handY + armSwing]], SKIN, INK, 1)}`
  const hands = `${ellipse(g.torsoLeft - 2, handY - armSwing, 3, 3.7, SKIN_SHADOW, INK, 1)}${ellipse(g.torsoLeft + g.torsoWidth + 2, handY + armSwing, 3, 3.7, SKIN, INK, 1)}${line(g.torsoLeft + g.torsoWidth, handY - 1 + armSwing, g.torsoLeft + g.torsoWidth + 3, handY - 1 + armSwing, SKIN_LIGHT, 0.8)}`
  return `${ears}${head}${jawShade}${templeLight}${face}${arms}${hands}`
}

function hairLayer(p) {
  const g = geometry(p)
  const top = p.headY + 1
  if (g.rear) {
    const cap = ellipse(g.headCenter, top + 8.5, g.side ? 9 : 11.5, 10, HAIR, INK, 1)
    const nape = polygon([
      [g.headCenter - 10, top + 10], [g.headCenter - 8, top + 21], [g.headCenter - 4, top + 18],
      [g.headCenter - 1, top + 22], [g.headCenter + 3, top + 18], [g.headCenter + 7, top + 21],
      [g.headCenter + 10, top + 9],
    ], HAIR_SHADOW, INK, 1)
    const crownLight = pathShape(`M ${q(g.headCenter - 7)} ${q(top + 4)} Q ${q(g.headCenter - 1)} ${q(top)} ${q(g.headCenter + 5)} ${q(top + 4)}`, 'none', HAIR_LIGHT, 1.6)
    const strands = `${line(g.headCenter - 5, top + 11, g.headCenter - 3, top + 18, HAIR_LIGHT, 1)}${line(g.headCenter + 2, top + 11, g.headCenter + 4, top + 18, HAIR_LIGHT, 1)}`
    return `${cap}${nape}${crownLight}${strands}`
  }

  const sweep = g.sign * (g.side ? 3 : g.diagonal ? 2 : 0)
  const cap = ellipse(g.headCenter - sweep, top + 3, g.side ? 8 : 11, 6, HAIR, INK, 1)
  const fringe = polygon([
    [g.headCenter - 10 + sweep, top + 4], [g.headCenter - 8 + sweep, top + 12],
    [g.headCenter - 5 + sweep, top + 8], [g.headCenter - 2 + sweep, top + 13],
    [g.headCenter + 1 + sweep, top + 8], [g.headCenter + 4 + sweep, top + 12],
    [g.headCenter + 7 + sweep, top + 7], [g.headCenter + 10 + sweep, top + 9],
    [g.headCenter + 9 + sweep, top + 1], [g.headCenter - 8 + sweep, top],
  ], HAIR, INK, 1)
  const sideLock = g.side
    ? polygon([
        [g.headCenter - g.sign * 5, top + 6], [g.headCenter - g.sign * 8, top + 15],
        [g.headCenter - g.sign * 4, top + 18], [g.headCenter - g.sign * 1, top + 10],
      ], HAIR_SHADOW, INK, 0.8)
    : `${polygon([[g.headCenter - 10, top + 7], [g.headCenter - 9, top + 17], [g.headCenter - 6, top + 14]], HAIR_SHADOW)}${polygon([[g.headCenter + 10, top + 7], [g.headCenter + 9, top + 17], [g.headCenter + 6, top + 14]], HAIR_SHADOW)}`
  const crownLight = pathShape(`M ${q(g.headCenter - 6 - sweep)} ${q(top + 1.5)} Q ${q(g.headCenter - sweep)} ${q(top - 1)} ${q(g.headCenter + 4 - sweep)} ${q(top + 1.5)}`, 'none', HAIR_LIGHT, 1.4)
  return `${cap}${sideLock}${fringe}${crownLight}`
}

function topLayer(p, variant = 'radio-hoodie') {
  const g = geometry(p)
  const colors = palette(variant)
  const tee = variant === 'radiotedu-tee'
  const varsity = variant === 'varsity-jacket'
  const bodyColor = g.rear ? colors.shade : colors.base
  const armSwing = p.action === 'walk' ? p.swing : 0
  const armBottom = p.seated > 0.5 ? p.hipY + 1 : p.hipY - 2
  const body = polygon([
    [g.torsoLeft + 4, g.torsoTop],
    [g.torsoLeft + g.torsoWidth - 4, g.torsoTop],
    [g.torsoLeft + g.torsoWidth, g.torsoTop + 5],
    [g.torsoLeft + g.torsoWidth - 1, g.torsoBottom],
    [g.torsoLeft + 1, g.torsoBottom],
    [g.torsoLeft, g.torsoTop + 5],
  ], bodyColor, INK, 1.3)
  const sideShade = g.rear
    ? ''
    : polygon([
        [g.torsoLeft + (g.sign > 0 ? 0 : g.torsoWidth - 5), g.torsoTop + 4],
        [g.torsoLeft + (g.sign > 0 ? 5 : g.torsoWidth), g.torsoTop + 6],
        [g.torsoLeft + (g.sign > 0 ? 5 : g.torsoWidth - 5), g.torsoBottom - 1],
        [g.torsoLeft + (g.sign > 0 ? 1 : g.torsoWidth - 1), g.torsoBottom - 1],
      ], colors.shade)

  let farArm = ''
  let nearArm = ''
  let cuffs = ''
  if (p.seated > 0.5) {
    if (tee) {
      farArm = polygon([
        [g.torsoLeft + 3, g.torsoTop + 3], [g.torsoLeft - 3, g.torsoTop + 8],
        [g.torsoLeft, g.torsoTop + 14], [g.torsoLeft + 6, g.torsoTop + 12],
      ], colors.sleeveShade, INK, 1)
      nearArm = polygon([
        [g.torsoLeft + g.torsoWidth - 3, g.torsoTop + 3], [g.torsoLeft + g.torsoWidth + 3, g.torsoTop + 8],
        [g.torsoLeft + g.torsoWidth, g.torsoTop + 14], [g.torsoLeft + g.torsoWidth - 6, g.torsoTop + 12],
      ], colors.sleeve, INK, 1)
    } else {
      const farWristX = g.center - 6.5 + p.dx * 3
      const nearWristX = g.center + 6.5 + p.dx * 3
      const farWristY = g.torsoTop + 21 + p.typing
      const nearWristY = g.torsoTop + 21 - p.typing
      farArm = polygon([
        [g.torsoLeft + 3, g.torsoTop + 3], [g.torsoLeft - 3, g.torsoTop + 9],
        [g.torsoLeft + 1, g.torsoTop + 15], [farWristX - 3, farWristY],
        [farWristX + 2, farWristY + 4], [g.torsoLeft + 7, g.torsoTop + 11],
      ], colors.sleeveShade, INK, 1)
      nearArm = polygon([
        [g.torsoLeft + g.torsoWidth - 3, g.torsoTop + 3], [g.torsoLeft + g.torsoWidth + 3, g.torsoTop + 9],
        [g.torsoLeft + g.torsoWidth - 1, g.torsoTop + 15], [nearWristX + 3, nearWristY],
        [nearWristX - 2, nearWristY + 4], [g.torsoLeft + g.torsoWidth - 7, g.torsoTop + 11],
      ], colors.sleeve, INK, 1)
      cuffs = `${line(farWristX - 2, farWristY + 1, farWristX + 2, farWristY + 4, colors.cuff, 1.4)}${line(nearWristX + 2, nearWristY + 1, nearWristX - 2, nearWristY + 4, colors.cuff, 1.4)}`
    }
  } else {
    const sleeveBottom = tee ? g.torsoTop + 12 : armBottom
    const sleeveInset = tee ? 2 : 0
    farArm = polygon([
      [g.torsoLeft + 3, g.torsoTop + 3], [g.torsoLeft - 4, g.torsoTop + 9],
      [g.torsoLeft - 3 + sleeveInset, sleeveBottom - armSwing], [g.torsoLeft + 2, sleeveBottom - armSwing],
      [g.torsoLeft + 7, g.torsoTop + 11],
    ], colors.sleeveShade, INK, 1)
    nearArm = polygon([
      [g.torsoLeft + g.torsoWidth - 3, g.torsoTop + 3], [g.torsoLeft + g.torsoWidth + 4, g.torsoTop + 9],
      [g.torsoLeft + g.torsoWidth + 3 - sleeveInset, sleeveBottom + armSwing], [g.torsoLeft + g.torsoWidth - 2, sleeveBottom + armSwing],
      [g.torsoLeft + g.torsoWidth - 7, g.torsoTop + 11],
    ], colors.sleeve, INK, 1)
    if (!tee) {
      cuffs = `${line(g.torsoLeft - 3, sleeveBottom - 2 - armSwing, g.torsoLeft + 2, sleeveBottom - 2 - armSwing, colors.cuff, 1.4)}${line(g.torsoLeft + g.torsoWidth - 2, sleeveBottom - 2 + armSwing, g.torsoLeft + g.torsoWidth + 3, sleeveBottom - 2 + armSwing, colors.cuff, 1.4)}`
    }
  }

  let detail = ''
  if (g.rear) {
    if (!tee) {
      detail += pathShape(`M ${q(g.center - 9)} ${q(g.torsoTop + 2)} Q ${q(g.center)} ${q(g.torsoTop + 13)} ${q(g.center + 9)} ${q(g.torsoTop + 2)}`, 'none', colors.light, 1.7)
      detail += pathShape(`M ${q(g.center - 6)} ${q(g.torsoTop + 4)} Q ${q(g.center)} ${q(g.torsoTop + 10)} ${q(g.center + 6)} ${q(g.torsoTop + 4)}`, 'none', colors.shade, 1)
    }
    detail += line(g.center, g.torsoTop + 12, g.center, g.torsoBottom - 3, colors.light, 0.8)
  } else {
    const zipX = g.center + (g.side ? g.sign * 4 : g.diagonal ? g.sign * 2 : 0)
    if (!tee) {
      detail += pathShape(`M ${q(zipX - 5)} ${q(g.torsoTop + 2)} Q ${q(zipX)} ${q(g.torsoTop + 7)} ${q(zipX + 5)} ${q(g.torsoTop + 2)}`, 'none', colors.shade, 1.2)
      detail += line(zipX, g.torsoTop + 4, zipX, g.torsoBottom - 2, colors.accent, 1.2)
      detail += `${line(zipX - 3, g.torsoTop + 4, zipX - 3, g.torsoTop + 11, colors.accent, 0.9)}${line(zipX + 3, g.torsoTop + 4, zipX + 3, g.torsoTop + 11, colors.accent, 0.9)}`
      detail += pathShape(`M ${q(g.torsoLeft + 5)} ${q(g.torsoBottom - 8)} Q ${q(zipX)} ${q(g.torsoBottom - 4)} ${q(g.torsoLeft + g.torsoWidth - 5)} ${q(g.torsoBottom - 8)}`, 'none', colors.light, 0.9)
    }
    if (!g.side && variant === 'radio-hoodie') {
      const badgeX = zipX + (g.sign > 0 ? 4 : -9)
      detail += rect(badgeX, g.torsoTop + 9, 6, 5, colors.accent, INK, 0.6, 1)
      detail += `${line(badgeX + 1.7, g.torsoTop + 10, badgeX + 1.7, g.torsoTop + 13, colors.shade, 0.8)}${line(badgeX + 4.1, g.torsoTop + 10, badgeX + 4.1, g.torsoTop + 13, colors.shade, 0.8)}`
    }
    if (varsity) {
      detail += rect(g.torsoLeft + 1, g.torsoBottom - 4, g.torsoWidth - 2, 3, colors.accent, INK, 0.6, 1)
      detail += `${ellipse(zipX - 1, g.torsoTop + 9, 1, 1, colors.accent, INK, 0.5)}${ellipse(zipX - 1, g.torsoTop + 15, 1, 1, colors.accent, INK, 0.5)}`
      if (!g.side) {
        const patchX = zipX + (g.sign > 0 ? 4 : -10)
        detail += rect(patchX, g.torsoTop + 8, 6, 7, colors.accent, INK, 0.7, 1)
        detail += pathShape(`M ${q(patchX + 1.5)} ${q(g.torsoTop + 14)} L ${q(patchX + 3)} ${q(g.torsoTop + 9.5)} L ${q(patchX + 4.5)} ${q(g.torsoTop + 14)}`, 'none', colors.base, 1)
      }
    }
    if (tee && !g.side) {
      const badgeX = zipX + (g.sign > 0 ? 4 : -9)
      detail += rect(badgeX, g.torsoTop + 8, 7, 7, colors.accent, INK, 0.8, 1)
      detail += `${rect(badgeX + 1.4, g.torsoTop + 9.4, 1.4, 4.2, colors.light)}${rect(badgeX + 4.2, g.torsoTop + 9.4, 1.4, 4.2, colors.light)}`
    }
  }

  const shoulderLight = g.rear
    ? ''
    : line(g.torsoLeft + 5, g.torsoTop + 1.5, g.torsoLeft + g.torsoWidth - 5, g.torsoTop + 1.5, colors.light, 0.9)
  return `${farArm}${body}${sideShade}${nearArm}${cuffs}${shoulderLight}${detail}`
}

function bottomLayer(p, variant = 'jeans') {
  const g = geometry(p)
  const base = variant === 'black-cargos' ? '#20272b' : '#285f86'
  const shade = variant === 'black-cargos' ? '#10171a' : '#173c5a'
  const stitch = variant === 'black-cargos' ? '#8f784b' : '#6ea1bd'
  const light = variant === 'black-cargos' ? '#414b50' : '#4f8baa'
  const hipY = p.hipY

  if (p.seated > 0.5) {
    const forward = p.dx * 10
    const left = polygon([
      [g.center - 12, hipY], [g.center - 1, hipY], [g.center + forward + 1, hipY + 7],
      [g.center + forward - 2, hipY + 15], [g.center - 11, hipY + 10],
    ], shade, INK, 1)
    const right = polygon([
      [g.center + 1, hipY], [g.center + 12, hipY], [g.center + forward + 12, hipY + 8],
      [g.center + forward + 7, hipY + 16], [g.center + 1, hipY + 10],
    ], base, INK, 1)
    const pockets = variant === 'black-cargos'
      ? `${rect(g.center - 11, hipY + 3, 6, 5, shade, stitch, 0.8, 1)}${rect(g.center + 5, hipY + 3, 6, 5, shade, stitch, 0.8, 1)}`
      : ''
    const knees = `${pathShape(`M ${q(g.center + forward - 5)} ${q(hipY + 9)} Q ${q(g.center + forward)} ${q(hipY + 12)} ${q(g.center + forward + 3)} ${q(hipY + 13)}`, 'none', light, 1)}${pathShape(`M ${q(g.center + forward + 6)} ${q(hipY + 9)} Q ${q(g.center + forward + 10)} ${q(hipY + 11)} ${q(g.center + forward + 11)} ${q(hipY + 13)}`, 'none', light, 1)}`
    return `${left}${right}${knees}${pockets}`
  }

  const walk = p.action === 'walk' ? p.swing * 0.75 : 0
  const leftY = hipY + walk
  const rightY = hipY - walk
  const far = polygon([
    [g.center - 12, leftY], [g.center - 1, leftY],
    [g.center - 2, leftY + 13], [g.center - 3, leftY + 24],
    [g.center - 11, leftY + 24], [g.center - 12, leftY + 12],
  ], shade, INK, 1)
  const near = polygon([
    [g.center + 1, rightY], [g.center + 12, rightY],
    [g.center + 12, rightY + 12], [g.center + 11, rightY + 24],
    [g.center + 3, rightY + 24], [g.center + 2, rightY + 13],
  ], base, INK, 1)
  const waist = rect(g.center - 12.5, hipY - 2, 25, 5, base, INK, 1, 2)
  const pockets = variant === 'black-cargos'
    ? g.rear
      ? `${rect(g.center - 10, hipY + 5, 7, 5, shade, stitch, 0.8, 1)}${rect(g.center + 3, hipY + 5, 7, 5, shade, stitch, 0.8, 1)}${line(g.center, hipY + 3, g.center, hipY + 15, stitch, 0.8)}`
      : `${rect(g.center - 12, hipY + 7, 6, 6, shade, stitch, 0.8, 1)}${rect(g.center + 6, hipY + 7, 6, 6, shade, stitch, 0.8, 1)}`
    : `${line(g.center - 9, hipY + 4, g.center - 4, hipY + 7, stitch, 0.8)}${line(g.center + 9, hipY + 4, g.center + 4, hipY + 7, stitch, 0.8)}`
  const creases = `${line(g.center - 8, hipY + 13 + walk, g.center - 5, hipY + 17 + walk, light, 0.8)}${line(g.center + 8, hipY + 13 - walk, g.center + 5, hipY + 17 - walk, light, 0.8)}`
  const hems = `${line(g.center - 10, hipY + 21 + walk, g.center - 3, hipY + 21 + walk, stitch, 0.8)}${line(g.center + 3, hipY + 21 - walk, g.center + 10, hipY + 21 - walk, stitch, 0.8)}`
  return `${far}${near}${waist}${creases}${hems}${pockets}`
}

function shoesLayer(p, variant = 'sneakers') {
  const g = geometry(p)
  const boots = variant === 'boots'
  const base = boots ? '#4b3428' : '#f4faf8'
  const accent = boots ? '#251913' : '#168c91'
  const highlight = boots ? '#80604a' : '#d6f1eb'
  const walk = p.action === 'walk' ? p.swing * 0.75 : 0

  if (p.seated > 0.5) {
    const forward = p.dx * 10
    const y = p.hipY + 14
    const height = boots ? 8 : 6
    const far = polygon([
      [g.center + forward - 8, y], [g.center + forward + 2, y],
      [g.center + forward + 5, y + height - 2], [g.center + forward + 4, y + height],
      [g.center + forward - 8, y + height],
    ], base, INK, 1)
    const near = polygon([
      [g.center + forward + 5, y + 1], [g.center + forward + 15, y + 1],
      [g.center + forward + 19, y + height - 1], [g.center + forward + 18, y + height + 1],
      [g.center + forward + 5, y + height + 1],
    ], base, INK, 1)
    const soles = `${line(g.center + forward - 7, y + height - 1, g.center + forward + 4, y + height - 1, accent, 1.5)}${line(g.center + forward + 6, y + height, g.center + forward + 18, y + height, accent, 1.5)}`
    const detail = `${line(g.center + forward - 3, y + 2, g.center + forward + 2, y + 2, highlight, 1)}${line(g.center + forward + 10, y + 3, g.center + forward + 15, y + 3, highlight, 1)}`
    return `${far}${near}${soles}${detail}`
  }

  const y = p.hipY + 22
  const facingNudge = p.dx * 2
  const height = boots ? 8 : 6
  const far = polygon([
    [g.center - 13 + facingNudge, y - 1 + walk], [g.center - 3 + facingNudge, y - 1 + walk],
    [g.center + 1 + facingNudge, y + height - 2 + walk], [g.center - 1 + facingNudge, y + height + walk],
    [g.center - 14 + facingNudge, y + height + walk], [g.center - 14 + facingNudge, y + 2 + walk],
  ], base, INK, 1)
  const near = polygon([
    [g.center + 2 + facingNudge, y - 1 - walk], [g.center + 12 + facingNudge, y - 1 - walk],
    [g.center + 16 + facingNudge, y + height - 2 - walk], [g.center + 14 + facingNudge, y + height - walk],
    [g.center + 1 + facingNudge, y + height - walk], [g.center + 1 + facingNudge, y + 2 - walk],
  ], base, INK, 1)
  const soles = `${line(g.center - 13 + facingNudge, y + height - 1 + walk, g.center - 1 + facingNudge, y + height - 1 + walk, accent, 1.5)}${line(g.center + 2 + facingNudge, y + height - 1 - walk, g.center + 14 + facingNudge, y + height - 1 - walk, accent, 1.5)}`
  const detail = `${line(g.center - 9 + facingNudge, y + 1 + walk, g.center - 4 + facingNudge, y + 1 + walk, highlight, 1)}${line(g.center + 6 + facingNudge, y + 1 - walk, g.center + 11 + facingNudge, y + 1 - walk, highlight, 1)}`
  return `${far}${near}${soles}${detail}`
}

function hatLayer(p, variant = 'bucket-hat') {
  const g = geometry(p)
  const center = g.headCenter + p.dx * 0.8
  // Keep the brim/band above the eye line. The previous -4 offset placed both
  // hats across y=headY+11, exactly where the face renderer draws the eyes,
  // turning equipped avatars into a blank horizontal visor at game scale.
  const top = p.headY - 10
  const base = variant === 'beanie' ? '#8f2438' : '#0c6670'
  const light = variant === 'beanie' ? '#c94b5f' : '#43a4a6'
  const shade = variant === 'beanie' ? '#5f1828' : '#063a43'

  if (variant === 'beanie') {
    const width = g.side ? 9 : 12
    const pom = ellipse(center, top + 1, 3, 2.5, light, INK, 1)
    const crown = ellipse(center, top + 9, width, 10, base, INK, 1.5)
    const crownShade = pathShape(`M ${q(center - width + 2)} ${q(top + 8)} Q ${q(center)} ${q(top + 17)} ${q(center + width - 1)} ${q(top + 8)}`, 'none', shade, 1.2)
    const ribs = `${line(center - 5, top + 2, center - 4, top + 9, light, 0.8)}${line(center, top + 1, center, top + 9, light, 0.8)}${line(center + 5, top + 2, center + 4, top + 9, light, 0.8)}`
    const band = rect(center - width, top + 10, width * 2, 5, shade, INK, 1, 2)
    const bandHighlight = line(center - width + 2, top + 11.5, center + width - 2, top + 11.5, light, 0.8)
    return `${pom}${crown}${crownShade}${ribs}${band}${bandHighlight}`
  }

  const brimWidth = g.side ? 25 : g.diagonal ? 29 : 31
  const brimShift = g.side ? g.sign * 3 : g.diagonal ? g.sign * 1.5 : 0
  const crownWidth = g.side ? 17 : g.diagonal ? 20 : 22
  const crown = pathShape(
    `M ${q(center - crownWidth / 2)} ${q(top + 13)} L ${q(center - crownWidth / 2 + 2)} ${q(top + 6)} Q ${q(center)} ${q(top - 0.5)} ${q(center + crownWidth / 2 - 2)} ${q(top + 6)} L ${q(center + crownWidth / 2)} ${q(top + 13)} Z`,
    base,
    INK,
    1.5,
  )
  const crownShade = polygon([
    [center + crownWidth / 2 - 5, top + 3], [center + crownWidth / 2 - 2, top + 4],
    [center + crownWidth / 2, top + 13], [center + crownWidth / 2 - 5, top + 13],
  ], shade)
  const band = rect(center - crownWidth / 2, top + 10, crownWidth, 3, shade, INK, 1, 1)
  const brim = ellipse(center + brimShift, top + 14, brimWidth / 2, g.rear ? 3 : 3.8, base, INK, 1.5)
  const seam = g.rear
    ? `${line(center, top + 3, center, top + 9, light, 1)}${line(center - 7, top + 6, center - 5, top + 9, light, 1)}${line(center + 7, top + 6, center + 5, top + 9, light, 1)}`
    : line(center - crownWidth / 2 + 3, top + 6, center + crownWidth / 2 - 3, top + 6, light, 1)
  const eyelets = g.rear
    ? `${ellipse(center - 6, top + 7, 0.9, 0.9, light, INK, 0.5)}${ellipse(center + 6, top + 7, 0.9, 0.9, light, INK, 0.5)}`
    : `${ellipse(center - 6 + brimShift * 0.2, top + 7, 0.9, 0.9, light, INK, 0.5)}${ellipse(center + 6 + brimShift * 0.2, top + 7, 0.9, 0.9, light, INK, 0.5)}`
  const brimStitch = pathShape(`M ${q(center + brimShift - brimWidth / 2 + 3)} ${q(top + 14)} Q ${q(center + brimShift)} ${q(top + 17)} ${q(center + brimShift + brimWidth / 2 - 3)} ${q(top + 14)}`, 'none', light, 0.8)
  return `${crown}${crownShade}${seam}${eyelets}${band}${brim}${brimStitch}`
}

const LAYERS = {
  body: bodyLayer,
  skin: skinLayer,
  hair: hairLayer,
  top: topLayer,
  bottom: bottomLayer,
  shoes: shoesLayer,
  hat: hatLayer,
}

export function renderReferenceLayer(layer, pose, variant) {
  const renderer = LAYERS[layer]
  if (!renderer) throw new Error(`Unknown avatar layer: ${layer}`)
  return renderer(pose, variant)
}
