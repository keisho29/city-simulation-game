const CLEAR_MESSAGE = '街の進捗を消して、最初からやり直しますか？'

export function bindClearGame(onClear: () => void): void {
  const button = document.querySelector('#clear-game')
  if (!(button instanceof HTMLButtonElement)) {
    return
  }

  button.addEventListener('click', () => {
    if (window.confirm(CLEAR_MESSAGE)) {
      onClear()
    }
  })
}
