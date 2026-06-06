import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../services/api'

interface TaskSummaryItem {
  id: string
  title: string
  status: string
  priority: string
  assignees: string
}

interface TimeLogItem {
  user_id: string
  user_name: string
  hours: number
}

interface PeerScoreItem {
  reviewee_id: string
  reviewee_name: string
  avg_contribution_quality: number
  avg_communication: number
  avg_reliability: number
  avg_overall: number
  review_count: number
}

interface DisputeItem {
  id: string
  task_id: string
  task_title: string
  status: string
  reason: string
  outcome: string | null
}

interface AttendanceItem {
  user_id: string
  user_name: string
  attended_meetings: number
  total_meetings: number
  attendance_rate: number
}

interface ReportPreview {
  project: {
    id: string
    name: string
    course: string | null
    status: string
    due_date: string | null
  }
  generated_at: string
  task_summary: {
    total_tasks: number
    completed_tasks: number
    by_status: Record<string, number>
    items: TaskSummaryItem[]
  }
  time_logs: {
    total_hours: number
    by_member: TimeLogItem[]
  }
  peer_scores: {
    items: PeerScoreItem[]
  }
  disputes: {
    total: number
    open: number
    resolved: number
    items: DisputeItem[]
  }
  attendance: {
    total_meetings: number
    by_member: AttendanceItem[]
  }
}

export default function ReportPreviewPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [report, setReport] = useState<ReportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    if (!projectId) return
    api
      .get(`/projects/${projectId}/report/preview`)
      .then((response) => {
        setReport(response.data)
        setError(null)
      })
      .catch(() => setError('Failed to load contribution report preview'))
  }, [projectId])

  const handleDownloadPdf = async () => {
    if (!projectId) return
    setIsDownloading(true)
    try {
      const response = await api.get(`/projects/${projectId}/report`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `project-${projectId}-contribution-report.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Failed to download report PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  if (!report && !error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5">Contribution Report</Typography>
          <Typography variant="body2" color="text.secondary">
            {report?.project.name}
          </Typography>
        </Box>
        <Button variant="contained" onClick={handleDownloadPdf} disabled={isDownloading || !report}>
          {isDownloading ? 'Downloading...' : 'Download PDF'}
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {!report ? null : (
        <>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Task Summary
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Total: {report.task_summary.total_tasks} | Completed: {report.task_summary.completed_tasks}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Assignees</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.task_summary.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>{item.priority}</TableCell>
                    <TableCell>{item.assignees || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Time Logs
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Total hours: {report.time_logs.total_hours.toFixed(2)}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell align="right">Hours</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.time_logs.by_member.map((item) => (
                  <TableRow key={item.user_id}>
                    <TableCell>{item.user_name}</TableCell>
                    <TableCell align="right">{item.hours.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Peer Scores
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell align="right">Quality</TableCell>
                  <TableCell align="right">Communication</TableCell>
                  <TableCell align="right">Reliability</TableCell>
                  <TableCell align="right">Overall</TableCell>
                  <TableCell align="right">Reviews</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.peer_scores.items.map((item) => (
                  <TableRow key={item.reviewee_id}>
                    <TableCell>{item.reviewee_name}</TableCell>
                    <TableCell align="right">{item.avg_contribution_quality.toFixed(2)}</TableCell>
                    <TableCell align="right">{item.avg_communication.toFixed(2)}</TableCell>
                    <TableCell align="right">{item.avg_reliability.toFixed(2)}</TableCell>
                    <TableCell align="right">{item.avg_overall.toFixed(2)}</TableCell>
                    <TableCell align="right">{item.review_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Disputes
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Total: {report.disputes.total} | Open: {report.disputes.open} | Resolved: {report.disputes.resolved}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Outcome</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.disputes.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.task_title}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>{item.reason}</TableCell>
                    <TableCell>{item.outcome ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Attendance
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell align="right">Attended</TableCell>
                  <TableCell align="right">Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.attendance.by_member.map((item) => (
                  <TableRow key={item.user_id}>
                    <TableCell>{item.user_name}</TableCell>
                    <TableCell align="right">
                      {item.attended_meetings}/{item.total_meetings}
                    </TableCell>
                    <TableCell align="right">{item.attendance_rate.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Stack>
  )
}
