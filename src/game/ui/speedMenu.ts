import { GameSpeed } from '../constants.ts'

export type SpeedMenu = {
  apply: (speed: GameSpeed) => void
}

export function bindSpeedMenu(
  onChange: (speed: GameSpeed) => void,
  initialSpeed: GameSpeed = GameSpeed.X1,
): SpeedMenu {
  const menu = document.querySelector('#speed-menu')
  const apply = (speed: GameSpeed) => {
    if (!(menu instanceof HTMLElement)) {
      return
    }

    const buttons = menu.querySelectorAll<HTMLButtonElement>('[data-speed]')
    for (const button of buttons) {
      const active = Number(button.dataset.speed) === speed
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-pressed', String(active))
    }
  }

  if (!(menu instanceof HTMLElement)) {
    return { apply }
  }

  const buttons = menu.querySelectorAll<HTMLButtonElement>('[data-speed]')

  const setSpeed = (speed: GameSpeed) => {
    apply(speed)
    onChange(speed)
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const speed = Number(button.dataset.speed)
      if (
        speed === GameSpeed.Pause ||
        speed === GameSpeed.X1 ||
        speed === GameSpeed.X2 ||
        speed === GameSpeed.X5
      ) {
        setSpeed(speed)
      }
    })
  }

  setSpeed(initialSpeed)
  return { apply }
}
