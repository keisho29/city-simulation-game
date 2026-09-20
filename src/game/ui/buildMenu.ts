import { BuildTool } from '../buildings/catalog.ts'

export function bindBuildMenu(onChange: (tool: BuildTool) => void): void {
  const menu = document.querySelector('#build-menu')
  const hint = document.querySelector('#hud-hint')
  if (!(menu instanceof HTMLElement)) {
    return
  }

  const buttons = menu.querySelectorAll<HTMLButtonElement>('[data-tool]')

  const setTool = (tool: BuildTool) => {
    for (const button of buttons) {
      const active = button.dataset.tool === tool
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-pressed', String(active))
    }

    document.body.dataset.buildTool = tool
    if (hint) {
      hint.textContent =
        tool === BuildTool.House
          ? '空き地をクリックして木造住宅を置く'
          : '矢印キー / 右ドラッグで移動'
    }

    onChange(tool)
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const tool = button.dataset.tool
      if (tool === BuildTool.None || tool === BuildTool.House) {
        setTool(tool)
      }
    })
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setTool(BuildTool.None)
    }
  })

  setTool(BuildTool.None)
}
