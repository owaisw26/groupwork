export const PRIORITY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  low: { bg: '#DCFCE7', color: '#166534', label: 'Low' },
  medium: { bg: '#FEF3C7', color: '#B45309', label: 'Medium' },
  high: { bg: '#FEF2F2', color: '#DC2626', label: 'High' },
  urgent: { bg: '#FEE2E2', color: '#B91C1C', label: 'Urgent' },
}

export const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'] as const

/** Fixed width for priority pills — sized to fit the longest label ("Urgent"). */
export const PRIORITY_PILL_WIDTH = 80

/** Select is slightly wider to accommodate the dropdown chevron. */
export const PRIORITY_SELECT_WIDTH = 96

export const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

export const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  todo: { bg: '#F1F5F9', color: '#64748B' },
  in_progress: { bg: '#EFF6FF', color: '#2563EB' },
  review: { bg: '#FFFBEB', color: '#D97706' },
  done: { bg: '#DCFCE7', color: '#166534' },
}

export const AVATAR_COLORS = ['#F8C59A', '#F0B28E', '#A56B52', '#94A3B8', '#64748B']

export function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/** Task due date, falling back to the project due date when unset. */
export function getEffectiveDueDate(
  taskDueDate: string | null | undefined,
  projectDueDate: string | null | undefined,
): string | null {
  return taskDueDate ?? projectDueDate ?? null
}

export function formatTaskDueDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return isoDate
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
