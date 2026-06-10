const DISPLAY_NAME_KEY = 'costume-coordinator-display-name'

export function getDisplayName(): string {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function setDisplayName(name: string): void {
  const trimmed = name.trim()
  try {
    if (trimmed) {
      localStorage.setItem(DISPLAY_NAME_KEY, trimmed)
    } else {
      localStorage.removeItem(DISPLAY_NAME_KEY)
    }
  } catch {
    /* ignore quota / private mode */
  }
}
