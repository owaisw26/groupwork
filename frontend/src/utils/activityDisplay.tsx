import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import AddIcon from '@mui/icons-material/Add'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import type { ReactNode } from 'react'
import { APP_PRIMARY, fs } from '../appTheme'

const GREEN = '#16A34A'
const GREEN_BG = '#ECFDF5'
const BLUE_BG = '#EFF6FF'

export interface ActivityItem {
  id?: string
  action_type: string
  user_name: string
  project_name?: string
  entity_type?: string
  created_at?: string
}

interface ActivityVisual {
  icon: ReactNode
  iconBg: string
  actionLine: string
  detailLine: string | null
}

const ACTION_LABELS: Record<string, string> = {
  task_created: 'created a task',
  task_updated: 'updated a task',
  time_logged: 'logged time',
  meeting_note: 'added meeting notes',
  project_created: 'created the project',
  member_joined: 'joined the project',
  member_left: 'left the project',
  ownership_transferred: 'transferred project ownership',
}

function formatActionLabel(actionType: string): string {
  return ACTION_LABELS[actionType] ?? actionType.replace(/_/g, ' ')
}

export function formatActivityTimestamp(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  if (date.toDateString() === now.toDateString()) {
    return `today, ${time}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return `yesterday, ${time}`
  }

  const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${dateLabel}, ${time}`
}

export function getActivityVisual(item: ActivityItem): ActivityVisual {
  const actionLabel = formatActionLabel(item.action_type)
  const actionLine = `${item.user_name} ${actionLabel}`

  switch (item.action_type) {
    case 'time_logged':
      return {
        icon: <AccessTimeOutlinedIcon sx={{ fontSize: fs(18), color: GREEN }} />,
        iconBg: GREEN_BG,
        actionLine,
        detailLine: null,
      }
    case 'meeting_note':
      return {
        icon: <DescriptionOutlinedIcon sx={{ fontSize: fs(18), color: APP_PRIMARY }} />,
        iconBg: BLUE_BG,
        actionLine,
        detailLine: null,
      }
    case 'task_created':
      return {
        icon: <AddIcon sx={{ fontSize: fs(18), color: APP_PRIMARY }} />,
        iconBg: BLUE_BG,
        actionLine,
        detailLine: null,
      }
    case 'task_updated':
      return {
        icon: <HistoryOutlinedIcon sx={{ fontSize: fs(18), color: APP_PRIMARY }} />,
        iconBg: BLUE_BG,
        actionLine,
        detailLine: null,
      }
    case 'member_joined':
    case 'member_left':
      return {
        icon: <GroupOutlinedIcon sx={{ fontSize: fs(18), color: APP_PRIMARY }} />,
        iconBg: BLUE_BG,
        actionLine,
        detailLine: item.project_name ?? null,
      }
    default:
      return {
        icon: <HistoryOutlinedIcon sx={{ fontSize: fs(18), color: APP_PRIMARY }} />,
        iconBg: BLUE_BG,
        actionLine,
        detailLine: item.project_name ?? null,
      }
  }
}
