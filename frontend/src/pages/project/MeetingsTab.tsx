import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../services/api'
import { useAppSelector } from '../../store/hooks'

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
}

export default function MeetingsTab() {
  const { id: projectId } = useParams()
  const project = useAppSelector((state) =>
    state.projects.items.find((item) => item.id === projectId),
  )
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meetingDate, setMeetingDate] = useState('')
  const [agenda, setAgenda] = useState('')
  const [discussionPoints, setDiscussionPoints] = useState('')
  const [notes, setNotes] = useState('')
  const [attendeeIds, setAttendeeIds] = useState<string[]>([])
  const [actionItems, setActionItems] = useState<ActionItem[]>([])

  useEffect(() => {
    if (!projectId) return
    api.get(`/projects/${projectId}/meetings`).then((res) => {
      setMeetings(res.data.items ?? [])
    })
    api.get<Member[]>(`/projects/${projectId}/members`).then((res) => {
      setMembers(res.data)
      setAttendeeIds(res.data.map((m) => m.id))
    })
  }, [projectId])

  const handleCreate = async () => {
    if (!projectId || !meetingDate) return
    setError(null)
    try {
      await api.post(`/projects/${projectId}/meetings`, {
        meeting_date: new Date(meetingDate).toISOString(),
        agenda,
        discussion_points: discussionPoints,
        notes,
        attendee_ids: attendeeIds,
        action_items: actionItems,
        create_tasks_from_action_items: actionItems.some((a) => a.create_as_task),
      })
      const res = await api.get(`/projects/${projectId}/meetings`)
      setMeetings(res.data.items ?? [])
      setShowForm(false)
      setAgenda('')
      setDiscussionPoints('')
      setNotes('')
      setActionItems([])
    } catch {
      setError('Failed to save meeting')
    }
  }

  const toggleAttendee = (memberId: string) => {
    setAttendeeIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    )
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Meetings</Typography>
        <Button variant="contained" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New Meeting'}
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {showForm && (
        <Stack spacing={2} sx={{ mb: 3 }}>
          <TextField
            label="Meeting Date/Time"
            type="datetime-local"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Typography variant="subtitle2">Attendees</Typography>
          {members.map((member) => (
            <FormControlLabel
              key={member.id}
              control={
                <Checkbox
                  checked={attendeeIds.includes(member.id)}
                  onChange={() => toggleAttendee(member.id)}
                />
              }
              label={member.full_name}
            />
          ))}
          <TextField label="Agenda" multiline rows={2} value={agenda} onChange={(e) => setAgenda(e.target.value)} />
          <TextField label="Discussion Points" multiline rows={2} value={discussionPoints} onChange={(e) => setDiscussionPoints(e.target.value)} />
          <TextField label="Notes" multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button variant="contained" onClick={handleCreate}>Save Meeting</Button>
        </Stack>
      )}

      {meetings.length === 0 ? (
        <Typography color="text.secondary">No meetings recorded yet.</Typography>
      ) : (
        meetings.map((meeting) => (
          <Accordion key={meeting.id}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>
                {new Date(meeting.meeting_date).toLocaleString()} · {meeting.attendee_count ?? 0} attendees
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2"><strong>Agenda:</strong> {meeting.agenda || '—'}</Typography>
              <Typography variant="body2"><strong>Discussion:</strong> {meeting.discussion_points || '—'}</Typography>
              <Typography variant="body2"><strong>Notes:</strong> {meeting.notes || '—'}</Typography>
            </AccordionDetails>
          </Accordion>
        ))
      )}
      {project && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Project: {project.name}
        </Typography>
      )}
    </Paper>
  )
}
