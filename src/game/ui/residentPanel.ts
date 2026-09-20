import type { ResidentDetailView } from '../residents/inspect.ts'

type ResidentPanel = {
  render: (view: ResidentDetailView | undefined) => void
  onClose: (handler: () => void) => void
}

function setText(id: string, value: string): void {
  const node = document.querySelector(`#${id}`)
  if (node) {
    node.textContent = value
  }
}

export function bindResidentPanel(): ResidentPanel {
  const empty = document.querySelector('#resident-empty')
  const detail = document.querySelector('#resident-detail')
  const close = document.querySelector('#resident-close')

  const render = (view: ResidentDetailView | undefined) => {
    const hasView = Boolean(view)
    empty?.toggleAttribute('hidden', hasView)
    detail?.toggleAttribute('hidden', !hasView)
    close?.toggleAttribute('hidden', !hasView)

    if (!view) {
      return
    }

    setText('resident-name', view.name)
    setText('resident-age', view.age)
    setText('resident-state', view.state)
    setText('resident-home', view.home)
    setText('resident-job', view.job)
    setText('resident-workplace', view.workplace)
    setText('resident-hunger', view.hunger)
    setText('resident-money', view.money)
    setText('resident-happiness', view.happiness)
  }

  render(undefined)

  return {
    render,
    onClose: (handler) => {
      close?.addEventListener('click', handler)
    },
  }
}
