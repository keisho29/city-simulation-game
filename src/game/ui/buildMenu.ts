import {
  BUILDINGS,
  BuildTool,
  isBuildingTool,
  isEditTool,
  PaintMode,
} from '../buildings/catalog.ts'

type BuildMenuHandlers = {
  onToolChange: (tool: BuildTool) => void
  onPaintModeChange: (mode: PaintMode) => void
}

export function bindBuildMenu(handlers: BuildMenuHandlers): void {
  const menu = document.querySelector('#build-menu')
  const hint = document.querySelector('#hud-hint')
  if (!(menu instanceof HTMLElement)) {
    return
  }

  const toolButtons = menu.querySelectorAll<HTMLButtonElement>('[data-tool]')
  const modeButtons = menu.querySelectorAll<HTMLButtonElement>('[data-paint-mode]')
  let currentTool: BuildTool = BuildTool.None
  let currentMode: PaintMode = PaintMode.Click

  const updateHint = () => {
    if (!hint) {
      return
    }

    if (currentTool === BuildTool.Erase) {
      hint.textContent =
        currentMode === PaintMode.Drag
          ? 'ドラッグして建物や道路を削除する'
          : 'クリックして建物や道路を削除する'
      return
    }

    if (isBuildingTool(currentTool)) {
      const action = currentMode === PaintMode.Drag ? 'ドラッグして' : 'クリックして'
      hint.textContent = `空き地を${action}${BUILDINGS[currentTool].name}を置く（${BUILDINGS[currentTool].cost}）`
      return
    }

    hint.textContent = '矢印キー / 右ドラッグで移動'
  }

  const setTool = (tool: BuildTool) => {
    currentTool = tool
    for (const button of toolButtons) {
      const active = button.dataset.tool === tool
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-pressed', String(active))
    }

    document.body.dataset.buildTool = tool
    updateHint()
    handlers.onToolChange(tool)
  }

  const setPaintMode = (mode: PaintMode) => {
    currentMode = mode
    document.body.dataset.paintMode = mode
    for (const button of modeButtons) {
      const active = button.dataset.paintMode === mode
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-pressed', String(active))
    }

    updateHint()
    handlers.onPaintModeChange(mode)
  }

  for (const button of toolButtons) {
    button.addEventListener('click', () => {
      const tool = button.dataset.tool
      if (tool === BuildTool.None || (tool && isEditTool(tool))) {
        setTool(tool)
      }
    })
  }

  for (const button of modeButtons) {
    button.addEventListener('click', () => {
      const mode = button.dataset.paintMode
      if (mode === PaintMode.Click || mode === PaintMode.Drag) {
        setPaintMode(mode)
      }
    })
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setTool(BuildTool.None)
    }
  })

  setPaintMode(PaintMode.Click)
  setTool(BuildTool.None)
}
