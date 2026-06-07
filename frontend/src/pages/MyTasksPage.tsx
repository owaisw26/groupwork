import {
  Box,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SURFACE_CARD_SX } from '../appTheme'
import TaskDetailModal from '../components/TaskDetailModal'
import PageHeader from '../components/layout/PageHeader'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchProjects } from '../store/projectsSlice'
import { fetchMyTasks } from '../store/tasksSlice'

const STATUS_COLORS: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
  todo: 'default',
  in_progress: 'info',
  review: 'warning',
  done: 'success',
}

export default function MyTasksPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { myTasks, myTasksLoading } = useAppSelector((state) => state.tasks)
  const projects = useAppSelector((state) => state.projects.items)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  useEffect(() => {
    dispatch(fetchProjects())
    dispatch(fetchMyTasks())
  }, [dispatch])

  const getProjectOwnerId = (projectId: string) =>
    projects.find((p) => p.id === projectId)?.owner_id ?? ''

  if (myTasksLoading && myTasks.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title="My Tasks"
        subtitle="All tasks assigned to you across every project."
      />

      <Box sx={SURFACE_CARD_SX}>
        {myTasks.length === 0 ? (
          <Typography color="text.secondary">No tasks assigned to you yet.</Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Project</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Due Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myTasks.map((task) => (
                  <TableRow
                    key={task.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{task.title}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/projects/${task.project_id}/tasks`)
                        }}
                      >
                        {task.project_name ?? task.project_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.status.replace('_', ' ')}
                        size="small"
                        color={STATUS_COLORS[task.status] ?? 'default'}
                      />
                    </TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{task.priority}</TableCell>
                    <TableCell>{task.due_date ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          projectOwnerId={getProjectOwnerId(
            myTasks.find((t) => t.id === selectedTaskId)?.project_id ?? '',
          )}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </Box>
  )
}
