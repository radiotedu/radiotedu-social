import type { StudyRoomInstance, StudyRoomOverview } from '../adapters/StudyAdapter'

export const STUDY_ROOM_PLAYER_LIMIT = 60

export interface StudyRoomInstanceChoice {
  id: string | null
  number: number | null
  title: string
  description: string
  current: boolean
}

export function shouldOfferRoomInstanceSelection(overview: StudyRoomOverview): boolean {
  return overview.instanceCount > 1
}

export function buildRoomInstanceChoices(
  overview: StudyRoomOverview,
  currentInstance: StudyRoomInstance | null,
): readonly StudyRoomInstanceChoice[] {
  const automatic: StudyRoomInstanceChoice = {
    id: null,
    number: null,
    title: 'Best available',
    description: 'Continue in the first room with space.',
    current: false,
  }
  const rooms = Array.from({ length: overview.instanceCount }, (_, index) => {
    const number = index + 1
    const id = `${overview.roomId}-${number}`
    return {
      id,
      number,
      title: `Room ${number}`,
      description: `Up to ${STUDY_ROOM_PLAYER_LIMIT} students`,
      current: currentInstance?.id === id,
    }
  })
  return Object.freeze([automatic, ...rooms])
}

export async function chooseRoomInstance(input: {
  overview: StudyRoomOverview
  roomTitle: string
  currentInstance: StudyRoomInstance | null
}): Promise<string | null | undefined> {
  if (!shouldOfferRoomInstanceSelection(input.overview)) return null

  const dialog = document.createElement('dialog')
  dialog.className = 'room-instance-selector'
  dialog.setAttribute('aria-labelledby', 'room-instance-selector-title')

  const header = document.createElement('header')
  const heading = document.createElement('span')
  const eyebrow = document.createElement('small')
  eyebrow.textContent = 'LIVE CAMPUS'
  const title = document.createElement('h2')
  title.id = 'room-instance-selector-title'
  title.textContent = `Choose ${input.roomTitle} room`
  heading.append(eyebrow, title)
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'room-instance-selector-close'
  close.setAttribute('aria-label', 'Close room selection')
  close.textContent = '×'
  header.append(heading, close)

  const summary = document.createElement('p')
  summary.textContent = `${input.overview.occupancy} students are active across ${input.overview.instanceCount} rooms.`

  const choices = document.createElement('div')
  choices.className = 'room-instance-selector-choices'
  for (const choice of buildRoomInstanceChoices(input.overview, input.currentInstance)) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'room-instance-choice'
    button.dataset.instanceId = choice.id ?? 'automatic'
    if (choice.current) button.dataset.current = 'true'

    const roomNumber = document.createElement('span')
    roomNumber.textContent = choice.number === null ? 'AUTO' : String(choice.number).padStart(2, '0')
    const copy = document.createElement('span')
    const name = document.createElement('strong')
    name.textContent = choice.title
    const description = document.createElement('small')
    description.textContent = choice.current ? `${choice.description} · You are here` : choice.description
    copy.append(name, description)
    const action = document.createElement('b')
    action.textContent = choice.current ? 'CONTINUE' : 'JOIN'
    button.append(roomNumber, copy, action)
    choices.append(button)
  }

  const note = document.createElement('footer')
  note.textContent = `Rooms stay shared until ${STUDY_ROOM_PLAYER_LIMIT} students, then Social opens another room for smooth play.`
  dialog.append(header, summary, choices, note)
  document.body.append(dialog)

  return new Promise((resolve) => {
    let settled = false
    const finish = (choice: string | null | undefined) => {
      if (settled) return
      settled = true
      dialog.close()
      dialog.remove()
      resolve(choice)
    }
    close.addEventListener('click', () => finish(undefined))
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault()
      finish(undefined)
    })
    choices.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.room-instance-choice')
      if (!button) return
      finish(button.dataset.instanceId === 'automatic' ? null : button.dataset.instanceId)
    })
    dialog.showModal()
  })
}
