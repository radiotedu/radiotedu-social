import { describe, expect, it } from 'vitest'

import { CAMPUS_CAT_DISPLAY_NAME, STUDY_GEAR } from '../src/inventory/StudyGearStore'

describe('campus cat identity', () => {
  it('names every visible cat variant Kedü without changing stable inventory IDs', () => {
    const cats = STUDY_GEAR.filter((item) => item.kind === 'pet')
    expect(CAMPUS_CAT_DISPLAY_NAME).toBe('Kedü')
    expect(cats.map((cat) => cat.id)).toEqual(['pet-tarcin', 'pet-benek', 'pet-komur'])
    expect(cats.every((cat) => cat.name === CAMPUS_CAT_DISPLAY_NAME)).toBe(true)
  })
})
