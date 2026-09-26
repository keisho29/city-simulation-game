import { peekSaveLabel } from '../save/save.ts'

export const GUIDE_STORAGE_KEY = 'city-simulation-game.guide-seen'

export type TitleScreen = {
  showTitle: () => void
  hide: () => void
  showHowto: (mode: 'title' | 'play' | 'first') => void
  refresh: () => void
}

export function hasSeenGuide(storage: Pick<Storage, 'getItem'> = window.localStorage): boolean {
  return storage.getItem(GUIDE_STORAGE_KEY) === '1'
}

export function markGuideSeen(storage: Pick<Storage, 'setItem'> = window.localStorage): void {
  storage.setItem(GUIDE_STORAGE_KEY, '1')
}

export function bindTitleScreen(handlers: {
  onStart: () => void
  onContinue: () => void
  onHowtoClose: () => void
}): TitleScreen {
  const overlay = document.querySelector('#shell-overlay')
  const titleCard = document.querySelector('#title-card')
  const howtoCard = document.querySelector('#howto-card')
  const startButton = document.querySelector('#title-start')
  const continueButton = document.querySelector('#title-continue')
  const continueNote = document.querySelector('#title-continue-note')
  const howtoButton = document.querySelector('#title-howto')
  const howtoClose = document.querySelector('#howto-close')
  const howtoStart = document.querySelector('#howto-start')
  let howtoMode: 'title' | 'play' | 'first' = 'title'

  const setOverlay = (open: boolean) => {
    overlay?.toggleAttribute('hidden', !open)
  }

  const showTitle = () => {
    document.body.dataset.shell = 'title'
    titleCard?.removeAttribute('hidden')
    howtoCard?.setAttribute('hidden', '')
    refresh()
    setOverlay(true)
  }

  const hide = () => {
    document.body.dataset.shell = 'play'
    setOverlay(false)
    titleCard?.setAttribute('hidden', '')
    howtoCard?.setAttribute('hidden', '')
  }

  const showHowto = (mode: 'title' | 'play' | 'first') => {
    howtoMode = mode
    document.body.dataset.shell = mode === 'title' ? 'title' : 'play'
    titleCard?.setAttribute('hidden', '')
    howtoCard?.removeAttribute('hidden')
    if (howtoClose instanceof HTMLElement) {
      howtoClose.textContent = mode === 'first' ? 'あとで見る' : mode === 'play' ? '閉じる' : 'もどる'
    }
    if (howtoStart instanceof HTMLElement) {
      howtoStart.hidden = mode !== 'first'
    }
    setOverlay(true)
  }

  const refresh = () => {
    const label = peekSaveLabel(window.localStorage)
    if (continueButton instanceof HTMLButtonElement) {
      continueButton.disabled = !label
    }
    if (continueNote) {
      continueNote.textContent = label ? `${label}の街` : 'セーブがありません'
    }
  }

  startButton?.addEventListener('click', () => handlers.onStart())
  continueButton?.addEventListener('click', () => {
    if (continueButton instanceof HTMLButtonElement && continueButton.disabled) {
      return
    }
    handlers.onContinue()
  })
  howtoButton?.addEventListener('click', () => showHowto('title'))
  howtoClose?.addEventListener('click', () => {
    if (howtoMode === 'title') {
      showTitle()
      return
    }
    hide()
    handlers.onHowtoClose()
  })
  howtoStart?.addEventListener('click', () => {
    markGuideSeen()
    hide()
    handlers.onHowtoClose()
  })

  refresh()
  return { showTitle, hide, showHowto, refresh }
}
