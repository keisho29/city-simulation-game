import { HISTORY_LIMIT } from '../constants.ts'

export type HistoryEntry = {
  year: number
  month: number
  text: string
}

export function pushHistory(
  history: HistoryEntry[],
  year: number,
  month: number,
  text: string,
): HistoryEntry[] {
  history.push({ year, month, text })
  if (history.length > HISTORY_LIMIT) {
    history.splice(0, history.length - HISTORY_LIMIT)
  }
  return history
}

export function historyLabel(entry: HistoryEntry): string {
  return `${entry.year}年${entry.month}月 ${entry.text}`
}

export function parseHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const entries: HistoryEntry[] = []
  for (const entry of raw) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof (entry as HistoryEntry).text !== 'string' ||
      typeof (entry as HistoryEntry).year !== 'number' ||
      typeof (entry as HistoryEntry).month !== 'number'
    ) {
      continue
    }
    const year = (entry as HistoryEntry).year
    const month = (entry as HistoryEntry).month
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      continue
    }
    entries.push({
      year,
      month: Math.max(1, Math.min(12, Math.floor(month))),
      text: (entry as HistoryEntry).text.slice(0, 80),
    })
  }
  return entries.slice(-HISTORY_LIMIT)
}
