import { BEST_SCORE_KEY } from './constants.ts'

type Shell = 'title' | 'howto' | 'play' | 'over'

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id)
  if (!node) throw new Error(`#${id} がありません`)
  return node as T
}

export function readBest(): number {
  const raw = localStorage.getItem(BEST_SCORE_KEY)
  const n = raw ? Number(raw) : 0
  return Number.isFinite(n) ? n : 0
}

export function writeBest(score: number): number {
  const best = Math.max(readBest(), score)
  localStorage.setItem(BEST_SCORE_KEY, String(best))
  return best
}

export function setShell(shell: Shell) {
  document.body.dataset.shell = shell
  el('title-card').hidden = shell !== 'title'
  el('howto-card').hidden = shell !== 'howto'
  el('over-card').hidden = shell !== 'over'
  el('play-hud').hidden = shell === 'title' || shell === 'howto'
  el('controls').hidden = shell !== 'play'
}

export function setScore(meters: number, best: number) {
  el('hud-score').textContent = `${meters}m`
  el('hud-best').textContent = `最高 ${best}m`
}

export function setOver(meters: number, best: number) {
  el('over-score').textContent = `${meters}m`
  el('over-best').textContent = `最高 ${best}m`
}

export function bindHud(handlers: {
  start: () => void
  retry: () => void
  title: () => void
  jump: () => void
  slideDown: () => void
  slideUp: () => void
}) {
  el('title-start').addEventListener('click', handlers.start)
  el('title-howto').addEventListener('click', () => setShell('howto'))
  el('howto-close').addEventListener('click', () => setShell('title'))
  el('retry').addEventListener('click', handlers.retry)
  el('over-title').addEventListener('click', handlers.title)

  const jump = el<HTMLButtonElement>('btn-jump')
  const slide = el<HTMLButtonElement>('btn-slide')
  const pressJump = (event: Event) => {
    event.preventDefault()
    handlers.jump()
  }
  jump.addEventListener('pointerdown', pressJump)
  jump.addEventListener('click', pressJump)
  slide.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    handlers.slideDown()
  })
  slide.addEventListener('pointerup', handlers.slideUp)
  slide.addEventListener('pointerleave', handlers.slideUp)
  slide.addEventListener('pointercancel', handlers.slideUp)
}
