import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import MailOutlineOutlinedIcon from '@mui/icons-material/MailOutlineOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { APP_BORDER, APP_PRIMARY, APP_PRIMARY_LIGHT, fs, SLATE, SURFACE_CARD_SX } from '../../appTheme'
import { AVATAR_COLORS, memberInitials } from '../../constants/taskFields'
import api from '../../services/api'
import { useAppSelector } from '../../store/hooks'

interface Member {
  id: string
  full_name: string
  email: string
  role: string
  joined_at: string
}

interface ActivityItem {
  id: string
  action_type: string
  entity_type: string
  created_at: string
  user_name: string
}

interface TaskSlim {
  id: string
  assignee_ids: string[]
  status: string
}

function formatTimeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

function activityLabel(item: ActivityItem): string {
  const type = item.action_type ?? ''
  const name = item.user_name ?? 'Someone'
  if (type === 'member_joined') return `${name} joined the project`
  if (type === 'project_created') return `${name} created the project`
  if (type === 'task_created') return `${name} created a task`
  if (type === 'task_updated') return `${name} updated a task`
  if (type === 'task_completed') return `${name} completed a task`
  return `${name} · ${type.replace(/_/g, ' ')}`
}

function activityIcon(actionType: string | undefined) {
  if (actionType === 'member_joined') return <PersonAddOutlinedIcon sx={{ fontSize: 18, color: APP_PRIMARY }} />
  if (actionType === 'project_created') return <FolderOutlinedIcon sx={{ fontSize: 18, color: '#7C3AED' }} />
  if (actionType?.includes('task')) return <AssignmentOutlinedIcon sx={{ fontSize: 18, color: '#16A34A' }} />
  return <PersonOutlinedIcon sx={{ fontSize: 18, color: SLATE[400] }} />
}

function MemberRow({
  member,
  index,
  tasksAssigned,
  tasksCompleted,
  lastActive,
  canRemove,
  onRemove,
}: {
  member: Member
  index: number
  tasksAssigned: number
  tasksCompleted: number
  lastActive: string | null
  canRemove: boolean
  onRemove: () => void
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length]
  const isOwner = member.role === 'owner'

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '14px',
        border: `1px solid ${APP_BORDER}`,
        bgcolor: '#FFFFFF',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Avatar
          sx={{
            width: 48,
            height: 48,
            bgcolor: bg,
            color: SLATE[800],
            fontSize: 16,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {memberInitials(member.full_name)}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.25 }}>
            <Typography sx={{ fontSize: fs(15), fontWeight: 800, color: SLATE[900] }}>
              {member.full_name}
            </Typography>
            <Box
              sx={{
                px: 1, py: 0.2, borderRadius: '6px',
                bgcolor: isOwner ? APP_PRIMARY_LIGHT : '#F1F5F9',
                color: isOwner ? APP_PRIMARY : SLATE[500],
                fontSize: fs(11), fontWeight: 700,
              }}
            >
              {isOwner ? 'Owner' : 'Member'}
            </Box>
          </Box>
          <Typography sx={{ fontSize: fs(13), color: SLATE[400], mb: 1.25 }}>
            {member.email}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
              <AssignmentOutlinedIcon sx={{ fontSize: 15, color: SLATE[400] }} />
              <Typography sx={{ fontSize: fs(12), color: SLATE[500] }}>
                {tasksAssigned} tasks assigned
              </Typography>
            </Box>
            <Box sx={{ color: SLATE[200] }}>|</Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
              <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 15, color: '#16A34A' }} />
              <Typography sx={{ fontSize: fs(12), color: SLATE[500] }}>
                {tasksCompleted} completed
              </Typography>
            </Box>
            {lastActive && (
              <>
                <Box sx={{ color: SLATE[200] }}>|</Box>
                <Typography sx={{ fontSize: fs(12), color: SLATE[500] }}>
                  Last active {lastActive}
                </Typography>
              </>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {canRemove && !isOwner && (
            <>
              <IconButton
                size="small"
                onClick={(e) => setAnchor(e.currentTarget)}
                sx={{ color: SLATE[400] }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
              <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
                <MenuItem
                  onClick={() => { setAnchor(null); onRemove() }}
                  sx={{ color: '#DC2626', fontSize: fs(13) }}
                >
                  Remove from project
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default function MembersTab() {
  const { id } = useParams()
  const currentUser = useAppSelector((state) => state.auth.user)
  const project = useAppSelector((state) =>
    state.projects.items.find((item) => item.id === id) ?? state.projects.currentProject,
  )

  const [members, setMembers] = useState<Member[]>([])
  const [tasks, setTasks] = useState<TaskSlim[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [copied, setCopied] = useState(false)

  const isOwner = currentUser?.id === project?.owner_id

  useEffect(() => {
    if (!id) return
    api.get<Member[]>(`/projects/${id}/members`).then((r) => setMembers(r.data)).catch(() => {})
    api.get<{ items: TaskSlim[] }>(`/projects/${id}/tasks`).then((r) => setTasks(r.data.items ?? [])).catch(() => {})
    api.get<ActivityItem[]>(`/projects/${id}/activity`).then((r) => setActivity(r.data)).catch(() => {})
  }, [id])

  const handleCopyCode = () => {
    if (!project?.join_code) return
    navigator.clipboard.writeText(project.join_code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const memberStats = (memberId: string) => {
    const assigned = tasks.filter((t) => (t.assignee_ids ?? []).includes(memberId))
    return {
      tasksAssigned: assigned.length,
      tasksCompleted: assigned.filter((t) => t.status === 'done').length,
    }
  }

  const lastActiveFor = (memberId: string): string | null => {
    const entry = activity.find((a) => {
      const m = members.find((mem) => mem.id === memberId)
      return m && a.user_name === m.full_name && a.created_at
    })
    if (!entry?.created_at) return null
    const diffMs = Date.now() - new Date(entry.created_at).getTime()
    const days = Math.floor(diffMs / 86400000)
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    return `${days} days ago`
  }

  const recentActivity = activity.slice(0, 3)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography sx={{ fontSize: fs(22), fontWeight: 800, color: SLATE[900] }}>Members</Typography>
          <Typography sx={{ fontSize: fs(14), color: SLATE[500] }}>
            Manage your project team, invite members, and control access.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<ContentCopyOutlinedIcon />}
            onClick={handleCopyCode}
            sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
          >
            {copied ? 'Copied!' : 'Copy Join Code'}
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAddOutlinedIcon />}
            disabled
            sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none' }}
          >
            Email Invites Soon
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2.5} sx={{ alignItems: 'flex-start' }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={2.5}>
            <Box sx={SURFACE_CARD_SX}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Typography sx={{ fontSize: fs(16), fontWeight: 800, color: SLATE[900] }}>
                  Team Members
                </Typography>
                <Box
                  sx={{
                    px: 1.25, py: 0.25, borderRadius: '20px',
                    bgcolor: APP_PRIMARY_LIGHT, color: APP_PRIMARY,
                    fontSize: fs(12), fontWeight: 700,
                  }}
                >
                  {members.length} members
                </Box>
              </Box>
              <Stack spacing={1.5}>
                {members.map((member, index) => {
                  const stats = memberStats(member.id)
                  return (
                    <MemberRow
                      key={member.id}
                      member={member}
                      index={index}
                      tasksAssigned={stats.tasksAssigned}
                      tasksCompleted={stats.tasksCompleted}
                      lastActive={lastActiveFor(member.id)}
                      canRemove={isOwner}
                      onRemove={() => {}}
                    />
                  )
                })}
              </Stack>
            </Box>

            {recentActivity.length > 0 && (
              <Box sx={SURFACE_CARD_SX}>
                <Typography sx={{ fontSize: fs(16), fontWeight: 800, color: SLATE[900], mb: 2 }}>
                  Recent Member Activity
                </Typography>
                <Stack divider={<Divider />}>
                  {recentActivity.map((item) => (
                    <Box
                      key={item.id}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}
                    >
                      <Box
                        sx={{
                          width: 32, height: 32, borderRadius: '8px',
                          bgcolor: '#F8FAFF', border: `1px solid ${APP_BORDER}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}
                      >
                        {activityIcon(item.action_type)}
                      </Box>
                      <Typography sx={{ fontSize: fs(13), color: SLATE[700], flex: 1 }}>
                        {activityLabel(item)}
                      </Typography>
                      <Typography sx={{ fontSize: fs(12), color: SLATE[400], flexShrink: 0 }}>
                        {item.created_at ? formatTimeAgo(item.created_at) : ''}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
                {activity.length > 5 && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography
                      component="span"
                      sx={{ color: APP_PRIMARY, fontWeight: 700, fontSize: fs(13), cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                    >
                      View all activity →
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }} sx={{ display: 'flex' }}>
          <Stack spacing={2.5} sx={{ width: '100%', height: '100%' }}>
            <Box sx={{ ...SURFACE_CARD_SX, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <Box
                  sx={{
                    width: 38, height: 38, borderRadius: '10px', bgcolor: APP_PRIMARY_LIGHT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <MailOutlineOutlinedIcon sx={{ fontSize: 20, color: APP_PRIMARY }} />
                </Box>
                <Typography sx={{ fontSize: fs(15), fontWeight: 800, color: SLATE[900] }}>
                  Invite Member
                </Typography>
              </Box>
              <Typography sx={{ fontSize: fs(13), color: SLATE[500], mb: 2 }}>
                Email group invites are coming soon. Share the project join code for now.
              </Typography>
              <Alert
                severity="info"
                sx={{
                  borderRadius: '10px',
                  bgcolor: '#F8FAFF',
                  border: `1px solid ${APP_BORDER}`,
                }}
              >
                Email invites are a feature coming soon.
              </Alert>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.5 }}>
                <LockOutlinedIcon sx={{ fontSize: 14, color: SLATE[400] }} />
                <Typography sx={{ fontSize: fs(12), color: SLATE[400] }}>
                  Until then, teammates can join with the project code below.
                </Typography>
              </Box>
            </Box>

            {project?.join_code && (
              <Box sx={{ ...SURFACE_CARD_SX, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                  <Box
                    sx={{
                      width: 38, height: 38, borderRadius: '10px', bgcolor: '#F0FDF4',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    <ShieldOutlinedIcon sx={{ fontSize: 20, color: '#16A34A' }} />
                  </Box>
                  <Typography sx={{ fontSize: fs(15), fontWeight: 800, color: SLATE[900] }}>
                    Project Join Code
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: fs(13), color: SLATE[500], mb: 2 }}>
                  Share this code with your teammates so they can join the project.
                </Typography>
                <Box
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    px: 2.5, py: 1.75,
                    borderRadius: '12px',
                    border: `2px dashed ${APP_BORDER}`,
                    bgcolor: '#F8FAFF',
                    mb: 1.5,
                  }}
                >
                  <Typography sx={{ fontSize: fs(24), fontWeight: 800, color: '#16A34A', letterSpacing: 2 }}>
                    {project.join_code}
                  </Typography>
                  <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                    <IconButton size="small" onClick={handleCopyCode} sx={{ color: SLATE[500] }}>
                      <ContentCopyOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                  <TaskAltOutlinedIcon sx={{ fontSize: 14, color: SLATE[400], mt: 0.25 }} />
                  <Typography sx={{ fontSize: fs(12), color: SLATE[400] }}>
                    Anyone with this code can request to join. Only owners can approve access.
                  </Typography>
                </Box>
              </Box>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}
