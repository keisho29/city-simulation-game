import type { TileDetailView } from '../map/inspectTile.ts'
import type { ResidentDetailView } from '../residents/inspect.ts'

type InspectPanel = {
  render: (resident?: ResidentDetailView, tile?: TileDetailView) => void
  onClose: (handler: () => void) => void
}

function setText(id: string, value: string): void {
  const node = document.querySelector(`#${id}`)
  if (node) {
    node.textContent = value
  }
}

export function bindResidentPanel(): InspectPanel {
  const heading = document.querySelector('#resident-panel h2')
  const empty = document.querySelector('#resident-empty')
  const detail = document.querySelector('#resident-detail')
  const tileDetail = document.querySelector('#tile-detail')
  const close = document.querySelector('#resident-close')

  const render = (resident?: ResidentDetailView, tile?: TileDetailView) => {
    const hasResident = Boolean(resident)
    const hasTile = Boolean(tile) && !hasResident
    empty?.toggleAttribute('hidden', hasResident || hasTile)
    detail?.toggleAttribute('hidden', !hasResident)
    tileDetail?.toggleAttribute('hidden', !hasTile)
    close?.toggleAttribute('hidden', !hasResident && !hasTile)
    if (heading) {
      heading.textContent = hasTile ? '建物' : '住民'
    }

    if (resident) {
      setText('resident-name', resident.name)
      setText('resident-age', resident.age)
      setText('resident-state', resident.state)
      setText('resident-home', resident.home)
      setText('resident-job', resident.job)
      setText('resident-workplace', resident.workplace)
      setText('resident-hunger', resident.hunger)
      setText('resident-money', resident.money)
      setText('resident-happiness', resident.happiness)
      return
    }

    if (tile) {
      setText('tile-name', tile.name)
      setText('tile-level', tile.level)
      setText('tile-xp', tile.xp)
      setText('tile-value', tile.value)
      setText('tile-capacity', tile.capacity)
    }
  }

  render()

  return {
    render,
    onClose: (handler) => {
      close?.addEventListener('click', handler)
    },
  }
}
