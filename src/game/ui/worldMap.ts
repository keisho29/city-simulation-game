import {
  JAPAN_REGION_IDS,
  OVERSEAS_REGION_IDS,
  REGIONS,
  areaName,
  countryName,
  isOverseas,
  regionName,
  regionUnlockView,
  type RegionId,
} from '../world/regions.ts'
import type { WorldSession } from '../world/WorldSession.ts'

export type WorldMapUi = {
  render: (world: WorldSession) => void
  setOpen: (open: boolean) => void
}

type BoardView = 'japan' | 'world'

export function bindWorldMap(onSelect: (id: RegionId) => void): WorldMapUi {
  const overlay = document.querySelector('#world-map-overlay')
  const japanBoard = document.querySelector('#japan-board')
  const earthBoard = document.querySelector('#earth-board')
  const hint = document.querySelector('#world-map-hint')
  const stats = document.querySelector('#world-map-stats')
  const openButton = document.querySelector('#open-world-map')
  const closeButton = document.querySelector('#world-map-close')
  const tabs = document.querySelectorAll<HTMLButtonElement>('[data-world-view]')
  let lastWorld: WorldSession | undefined
  let lastKey = ''
  let view: BoardView = 'japan'

  const setOpen = (open: boolean) => {
    overlay?.toggleAttribute('hidden', !open)
    if (open && lastWorld) {
      paint(lastWorld, true)
    }
  }

  const setView = (next: BoardView) => {
    view = next
    japanBoard?.toggleAttribute('hidden', next !== 'japan')
    earthBoard?.toggleAttribute('hidden', next !== 'world')
    for (const tab of tabs) {
      tab.classList.toggle('is-active', tab.dataset.worldView === next)
    }
    if (lastWorld) {
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
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      if (tab.dataset.worldView === 'world' || tab.dataset.worldView === 'japan') {
        setView(tab.dataset.worldView)
      }
    })
  }

  const paint = (world: WorldSession, force = false) => {
    lastWorld = world
    if (!(japanBoard instanceof HTMLElement) || !(earthBoard instanceof HTMLElement)) {
      return
    }
    if (!force && overlay?.hasAttribute('hidden')) {
      return
    }

    const maps = new Map(
      world.regions
        .filter((region) => region.unlocked && region.map)
        .map((region) => [region.id, region.map!]),
    )
    const people = new Map(
      world.regions
        .filter((region) => region.sim)
        .map((region) => [region.id, region.sim!.residents]),
    )
    const census = world.census()
    const key = `${view}|${world.activeId}|${census.unlocked}|${census.population}|${JAPAN_REGION_IDS.concat(OVERSEAS_REGION_IDS)
      .map((id) => `${id}:${Boolean(world.region(id)?.unlocked)}`)
      .join(',')}`
    if (!force && key === lastKey && japanBoard.childElementCount > 0) {
      return
    }
    lastKey = key

    fillBoard(japanBoard, JAPAN_REGION_IDS, 'japan', world, maps, people, onSelect, setOpen)
    fillBoard(earthBoard, [...JAPAN_REGION_IDS, ...OVERSEAS_REGION_IDS], 'world', world, maps, people, onSelect, setOpen)

    if (stats) {
      stats.textContent = `開放 ${census.unlocked}/${census.total}都市　人口 ${census.population}　国 ${census.countries}　日本 ${census.japanUnlocked}/${census.japanTotal}　海外 ${census.overseasUnlocked}/${census.overseasTotal}`
    }

    if (hint) {
      const current = REGIONS[world.activeId]
      const links = world.linksFor(world.activeId)
      hint.textContent =
        links.length > 0
          ? `${countryName(current.country)}・${areaName(current.area)}の${current.name}から${links.map((link) => regionName(link.id)).join('、')}へ行けます`
          : `${current.name}を選んでいます。駅・港・空港で他地域とつながります。`
    }
  }

  const render = (world: WorldSession) => paint(world)

  return { render, setOpen }
}

function fillBoard(
  board: HTMLElement,
  ids: readonly RegionId[],
  kind: BoardView,
  world: WorldSession,
  maps: Map<RegionId, NonNullable<WorldSession['regions'][number]['map']>>,
  people: Map<RegionId, NonNullable<WorldSession['regions'][number]['sim']>['residents']>,
  onSelect: (id: RegionId) => void,
  setOpen: (open: boolean) => void,
): void {
  board.replaceChildren()
  for (const id of ids) {
    const def = REGIONS[id]
    const pos = kind === 'japan' ? def.japan : def.world
    if (pos.x < 0) {
      continue
    }
    const region = world.region(id)
    const view = regionUnlockView(id, world.progress, maps, people)
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'kanto-node'
    if (isOverseas(id)) {
      button.classList.add('is-overseas')
    }
    button.style.left = `${pos.x}%`
    button.style.top = `${pos.y}%`
    button.textContent = def.name
    const unlocked = Boolean(region?.unlocked)
    button.classList.toggle('is-active', world.activeId === id)
    button.classList.toggle('is-locked', !unlocked)
    button.disabled = !unlocked
    button.title = unlocked
      ? `${countryName(def.country)}／${areaName(def.area)}／${def.name}（${def.climate}・${def.industry}）`
      : `未開放：${view.missing.join('、') || '条件未達'}`
    button.addEventListener('click', () => {
      if (unlocked) {
        onSelect(id)
        setOpen(false)
      }
    })
    board.append(button)
  }
}
