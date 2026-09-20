import { GameSpeed } from '../constants.ts'

export function bindSpeedMenu(onChange: (speed: GameSpeed) => void): void {
  const menu = document.querySelector('#speed-menu')
  if (!(menu instanceof HTMLElement)) {
    return
  }

  const buttons = menu.querySelectorAll<HTMLButtonElement>('[data-speed]')

  const setSpeed = (speed: GameSpeed) => {
    for (const button of buttons) {
      const active = Number(button.dataset.speed) === speed
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-pressed', String(active))
    }

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

  setSpeed(GameSpeed.X1)
}
