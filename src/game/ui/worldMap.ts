import {
  REGION_IDS,
  REGIONS,
  regionName,
  regionUnlockView,
  type RegionId,
} from '../world/regions.ts'
import type { WorldSession } from '../world/WorldSession.ts'

export type WorldMapUi = {
  render: (world: WorldSession) => void
  setOpen: (open: boolean) => void
}

export function bindWorldMap(onSelect: (id: RegionId) => void): WorldMapUi {
  const overlay = document.querySelector('#world-map-overlay')
  const board = document.querySelector('#kanto-board')
  const hint = document.querySelector('#world-map-hint')
  const openButton = document.querySelector('#open-world-map')
  const closeButton = document.querySelector('#world-map-close')
  let lastWorld: WorldSession | undefined
  let lastKey = ''

  const setOpen = (open: boolean) => {
    overlay?.toggleAttribute('hidden', !open)
    if (open && lastWorld) {
      paint(lastWorld, true)
    }
  }

  openButton?.addEventListener('click', () => setOpen(true))
  closeButton?.addEventListener('click', () => setOpen(false))
  overlay?.addEventListener('click', (event) => {
    if (event.target === overlay) {
      setOpen(false)
    }
  })

  const paint = (world: WorldSession, force = false) => {
    lastWorld = world
    if (!(board instanceof HTMLElement)) {
      return
    }
    if (!force && overlay?.hasAttribute('hidden')) {
      return
    }

    const maps = new Map(
      world.regions.filter((region) => region.unlocked).map((region) => [region.id, region.map]),
    )
    const people = new Map(
      world.regions
        .filter((region) => region.sim)
        .map((region) => [region.id, region.sim!.residents]),
    )
    const key = REGION_IDS.map((id) => {
      const unlocked = Boolean(world.region(id)?.unlocked)
      const missing = regionUnlockView(id, world.progress, maps, people).missing.join('+')
      return `${id}:${unlocked}:${world.activeId === id}:${missing}`
    }).join('|')
    if (!force && key === lastKey && board.childElementCount > 0) {
      return
    }
    lastKey = key
    board.replaceChildren()

    for (const id of REGION_IDS) {
      const def = REGIONS[id]
      const region = world.region(id)
      const view = regionUnlockView(id, world.progress, maps, people)
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'kanto-node'
      button.style.left = `${def.map.x}%`
      button.style.top = `${def.map.y}%`
      button.textContent = def.name
      const unlocked = Boolean(region?.unlocked)
      button.classList.toggle('is-active', world.activeId === id)
      button.classList.toggle('is-locked', !unlocked)
      button.disabled = !unlocked
      button.title = unlocked
        ? `${def.name}（${def.climate}）`
        : `未開放：${view.missing.join('、') || '条件未達'}`
      button.addEventListener('click', () => {
        if (unlocked) {
          onSelect(id)
          setOpen(false)
        }
      })
      board.append(button)
    }

    if (hint) {
      const current = REGIONS[world.activeId]
      const links = world.linksFor(world.activeId)
      hint.textContent =
        links.length > 0
          ? `${current.name}から${links.map((link) => regionName(link.id)).join('、')}へ行けます`
          : `${current.name}を選んでいます。駅や港で他地域とつながります。`
    }
  }

  const render = (world: WorldSession) => paint(world)

  return { render, setOpen }
}
