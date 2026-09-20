const TOAST_MS = 5200

export function showToast(message: string): void {
  const stack = document.querySelector('#toast-stack')
  if (!(stack instanceof HTMLElement) || !message) {
    return
  }

  const toast = document.createElement('p')
  toast.className = 'toast'
  toast.textContent = message
  stack.append(toast)
  window.setTimeout(() => {
    toast.classList.add('is-leaving')
    window.setTimeout(() => toast.remove(), 280)
  }, TOAST_MS)

  while (stack.children.length > 4) {
    stack.firstElementChild?.remove()
  }
}
