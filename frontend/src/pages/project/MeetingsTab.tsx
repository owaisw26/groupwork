import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { APP_BORDER, APP_PRIMARY, APP_PRIMARY_LIGHT, fs, SLATE, SURFACE_CARD_SX } from '../../appTheme'
import api from '../../services/api'

interface Member {
  id: string
  full_name: string
}

interface ActionItem {
  description: string
  assignee_id: string
  due_date: string
  create_as_task: boolean
}

interface Meeting {
  id: string
  meeting_date: string
  agenda: string | null
  discussion_points: string | null
  action_items: ActionItem[]
  notes: string | null
  created_by_name?: string
  attendee_count?: number
  attendee_names?: string[]
}

function toDatetimeLocal(isoString?: string): string {
  const d = isoString ? new Date(isoString) : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function isUpcoming(isoDate: string): boolean {
  return new Date(isoDate) > new Date()
}

interface MeetingFormProps {
  members: Member[]
  initial?: Meeting
  onSave: (data: {
    meeting_date: string
    agenda: string
    discussion_points: string
    notes: string
    attendee_ids: string[]
  }) => Promise<void>
  onCancel: () => void
  saveLabel?: string
}

function MeetingForm({ members, initial, onSave, onCancel, saveLabel = 'Save Meeting' }: MeetingFormProps) {
  const getInitialAttendeeIds = () =>
    initial?.attendee_names
      ? members
          .filter((member) => initial.attendee_names?.includes(member.full_name))
          .map((member) => member.id)
      : members.map((m) => m.id)

  const [meetingDate, setMeetingDate] = useState(
    initial ? toDatetimeLocal(initial.meeting_date) : toDatetimeLocal(),
  )
  const [agenda, setAgenda] = useState(initial?.agenda ?? '')
  const [discussionPoints, setDiscussionPoints] = useState(initial?.discussion_points ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [attendeeIds, setAttendeeIds] = useState<string[]>(getInitialAttendeeIds)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setAttendeeIds(getInitialAttendeeIds())
  }, [members, initial])

  const toggleAttendee = (id: string) =>
    setAttendeeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleSubmit = async () => {
    setError(null)
    setSaving(true)
    try {
      await onSave({
        meeting_date: new Date(meetingDate).toISOString(),
        agenda,
        discussion_points: discussionPoints,
        notes,
        attendee_ids: attendeeIds,
      })
    } catch {
      setError('Failed to save meeting. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={2} sx={{ p: 2.5, borderRadius: '14px', border: `1px solid ${APP_BORDER}`, bgcolor: '#FAFBFF' }}>
      <TextField
        label="Meeting Date & Time"
        type="datetime-local"
        value={meetingDate}
        onChange={(e) => setMeetingDate(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        size="small"
        fullWidth
      />
      <Box>
        <Typography sx={{ fontSize: fs(13), fontWeight: 700, color: SLATE[700], mb: 0.75 }}>Attendees</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {members.map((member) => (
            <FormControlLabel
              key={member.id}
              control={
                <Checkbox
                  size="small"
                  checked={attendeeIds.includes(member.id)}
                  onChange={() => toggleAttendee(member.id)}
                  sx={{ '&.Mui-checked': { color: APP_PRIMARY } }}
                />
              }
              label={<Typography sx={{ fontSize: fs(13) }}>{member.full_name}</Typography>}
            />
          ))}
        </Box>
      </Box>
      <TextField label="Agenda" multiline rows={2} size="small" fullWidth value={agenda} onChange={(e) => setAgenda(e.target.value)} />
      <TextField label="Discussion Points" multiline rows={2} size="small" fullWidth value={discussionPoints} onChange={(e) => setDiscussionPoints(e.target.value)} />
      <TextField label="Notes" multiline rows={2} size="small" fullWidth value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}>
          {saving ? 'Saving...' : saveLabel}
        </Button>
      </Box>
    </Stack>
  )
}

export default function MeetingsTab() {
  const { id: projectId } = useParams()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  const refresh = () => {
    if (!projectId) return
    api.get(`/projects/${projectId}/meetings`).then((res) => setMeetings(res.data.items ?? []))
  }

  useEffect(() => {
    if (!projectId) return
    refresh()
    api.get<Member[]>(`/projects/${projectId}/members`).then((res) => setMembers(res.data))
  }, [projectId])

  const handleCreate = async (data: object) => {
    await api.post(`/projects/${projectId}/meetings`, { ...data, action_items: [], create_tasks_from_action_items: false })
    refresh()
    setShowCreate(false)
  }

  const handleEdit = async (meetingId: string, data: object) => {
    const meeting = meetings.find((item) => item.id === meetingId)
    await api.put(`/projects/${projectId}/meetings/${meetingId}`, {
      ...data,
      action_items: meeting?.action_items ?? [],
    })
    refresh()
    setEditingId(null)
  }

  const filtered = useMemo(() => {
    let list = [...meetings]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((m) =>
        (m.agenda ?? '').toLowerCase().includes(q) ||
        (m.notes ?? '').toLowerCase().includes(q) ||
        (m.attendee_names ?? []).some((n) => n.toLowerCase().includes(q)),
      )
    }
    if (sortBy === 'oldest') list.reverse()
    if (sortBy === 'upcoming') list = list.filter((m) => isUpcoming(m.meeting_date))
    if (sortBy === 'past') list = list.filter((m) => !isUpcoming(m.meeting_date))
    return list
  }, [meetings, search, sortBy])

  const upcomingCount = meetings.filter((m) => isUpcoming(m.meeting_date)).length
  const avgAttendance = meetings.length > 0
    ? Math.round(meetings.reduce((sum, m) => sum + (m.attendee_count ?? 0), 0) / meetings.length)
    : 0

  return (
    <Box sx={SURFACE_CARD_SX}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography sx={{ fontSize: fs(20), fontWeight: 800, color: SLATE[900] }}>Meetings</Typography>
          <Typography sx={{ fontSize: fs(13), color: SLATE[500] }}>
            Schedule meetings, capture discussion points, and keep everyone aligned.
          </Typography>
        </Box>
        {!showCreate && (
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={() => setShowCreate(true)}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
          >
            New Meeting
          </Button>
        )}
      </Box>

      {/* Stats row */}
      {meetings.length > 0 && (
        <Box
          sx={{
            display: 'flex', gap: 2, mb: 2.5, p: 2,
            borderRadius: '12px', border: `1px solid ${APP_BORDER}`, bgcolor: '#FAFBFF',
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 120 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: APP_PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarTodayOutlinedIcon sx={{ fontSize: 18, color: APP_PRIMARY }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: fs(11), color: SLATE[500], fontWeight: 600 }}>Total Meetings</Typography>
              <Typography sx={{ fontSize: fs(18), fontWeight: 800, color: SLATE[900] }}>{meetings.length}</Typography>
            </Box>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 120 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarTodayOutlinedIcon sx={{ fontSize: 18, color: '#16A34A' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: fs(11), color: SLATE[500], fontWeight: 600 }}>Upcoming</Typography>
              <Typography sx={{ fontSize: fs(18), fontWeight: 800, color: SLATE[900] }}>{upcomingCount}</Typography>
            </Box>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 120 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GroupsOutlinedIcon sx={{ fontSize: 18, color: '#D97706' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: fs(11), color: SLATE[500], fontWeight: 600 }}>Avg Attendance</Typography>
              <Typography sx={{ fontSize: fs(18), fontWeight: 800, color: SLATE[900] }}>{avgAttendance}</Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Create form */}
      {showCreate && (
        <Box sx={{ mb: 2.5 }}>
          <MeetingForm members={members} onSave={handleCreate} onCancel={() => setShowCreate(false)} saveLabel="Create Meeting" />
        </Box>
      )}

      {/* Search + sort */}
      {meetings.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search meetings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon sx={{ fontSize: 18, color: SLATE[400] }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />
          <Select
            size="small"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{ minWidth: 150, borderRadius: '10px', fontSize: fs(13) }}
          >
            <MenuItem value="newest">Newest first</MenuItem>
            <MenuItem value="oldest">Oldest first</MenuItem>
            <MenuItem value="upcoming">Upcoming only</MenuItem>
            <MenuItem value="past">Past only</MenuItem>
          </Select>
        </Box>
      )}

      {/* Meeting list */}
      {meetings.length === 0 && !showCreate ? (
        <Typography sx={{ fontSize: fs(14), color: SLATE[400], fontStyle: 'italic' }}>
          No meetings recorded yet.
        </Typography>
      ) : filtered.length === 0 ? (
        <Typography sx={{ fontSize: fs(14), color: SLATE[400], fontStyle: 'italic' }}>
          No meetings match your search.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {filtered.map((meeting) => {
            const date = new Date(meeting.meeting_date)
            const upcoming = isUpcoming(meeting.meeting_date)
            return (
              <Box key={meeting.id}>
                {editingId === meeting.id ? (
                  <MeetingForm
                    members={members}
                    initial={meeting}
                    onSave={(data) => handleEdit(meeting.id, data)}
                    onCancel={() => setEditingId(null)}
                    saveLabel="Update Meeting"
                  />
                ) : (
                  <Accordion
                    disableGutters
                    elevation={0}
                    sx={{
                      border: `1px solid ${APP_BORDER}`,
                      borderRadius: '12px !important',
                      '&:before': { display: 'none' },
                      overflow: 'hidden',
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 1 }}>
                        {/* Date block */}
                        <Box
                          sx={{
                            width: 52, flexShrink: 0, textAlign: 'center',
                            p: 1, borderRadius: '10px',
                            bgcolor: upcoming ? APP_PRIMARY_LIGHT : '#F8FAFC',
                            border: `1px solid ${upcoming ? APP_PRIMARY : APP_BORDER}`,
                          }}
                        >
                          <Typography sx={{ fontSize: fs(18), fontWeight: 800, color: upcoming ? APP_PRIMARY : SLATE[700], lineHeight: 1 }}>
                            {date.getDate()}
                          </Typography>
                          <Typography sx={{ fontSize: fs(10), fontWeight: 700, color: upcoming ? APP_PRIMARY : SLATE[400], textTransform: 'uppercase' }}>
                            {date.toLocaleString('default', { month: 'short' })}
                          </Typography>
                          <Typography sx={{ fontSize: fs(10), color: upcoming ? APP_PRIMARY : SLATE[400] }}>
                            {date.getFullYear()}
                          </Typography>
                        </Box>

                        {/* Info */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontSize: fs(14), fontWeight: 700, color: SLATE[900] }}>
                              {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                            </Typography>
                            <Box
                              sx={{
                                px: 1, py: 0.2, borderRadius: '20px', fontSize: fs(11), fontWeight: 700,
                                bgcolor: upcoming ? APP_PRIMARY_LIGHT : '#F1F5F9',
                                color: upcoming ? APP_PRIMARY : SLATE[500],
                              }}
                            >
                              {upcoming ? 'Upcoming' : 'Past'}
                            </Box>
                          </Box>
                          <Typography sx={{ fontSize: fs(12), color: SLATE[400] }}>
                            {meeting.attendee_count ?? 0} attendee{(meeting.attendee_count ?? 0) !== 1 ? 's' : ''}
                            {meeting.attendee_names && meeting.attendee_names.length > 0
                              ? ` · ${meeting.attendee_names.join(', ')}`
                              : ''}
                          </Typography>
                        </Box>
                      </Box>
                    </AccordionSummary>

                    <AccordionDetails sx={{ borderTop: `1px solid ${APP_BORDER}`, pt: 1.5, px: 2 }}>
                      <Stack spacing={1.25} sx={{ mb: 1.5 }}>
                        {meeting.agenda && (
                          <Box>
                            <Typography sx={{ fontSize: fs(11), fontWeight: 700, color: SLATE[400], textTransform: 'uppercase', mb: 0.25 }}>Agenda</Typography>
                            <Typography sx={{ fontSize: fs(13), color: SLATE[800] }}>{meeting.agenda}</Typography>
                          </Box>
                        )}
                        {meeting.discussion_points && (
                          <Box>
                            <Typography sx={{ fontSize: fs(11), fontWeight: 700, color: SLATE[400], textTransform: 'uppercase', mb: 0.25 }}>Discussion</Typography>
                            <Typography sx={{ fontSize: fs(13), color: SLATE[800] }}>{meeting.discussion_points}</Typography>
                          </Box>
                        )}
                        {meeting.notes && (
                          <Box>
                            <Typography sx={{ fontSize: fs(11), fontWeight: 700, color: SLATE[400], textTransform: 'uppercase', mb: 0.25 }}>Notes</Typography>
                            <Typography sx={{ fontSize: fs(13), color: SLATE[800] }}>{meeting.notes}</Typography>
                          </Box>
                        )}
                      </Stack>
                      <Button
                        size="small"
                        onClick={() => setEditingId(meeting.id)}
                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: fs(13) }}
                      >
                        Edit
                      </Button>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
