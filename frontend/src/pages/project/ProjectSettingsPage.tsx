import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { APP_PRIMARY, APP_PRIMARY_LIGHT, fs, SLATE, SURFACE_CARD_SX } from '../../appTheme'
import api from '../../services/api'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { deleteProject, fetchDashboard, fetchProject } from '../../store/projectsSlice'

function normalizeConfirmationName(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function SummaryRow({ icon, label, sublabel, value }: { icon: React.ReactNode; label: string; sublabel: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
      <Box
        sx={{
          width: 36, height: 36, borderRadius: '10px', bgcolor: APP_PRIMARY_LIGHT,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: fs(14), fontWeight: 700, color: SLATE[900] }}>{label}</Typography>
        <Typography sx={{ fontSize: fs(12), color: SLATE[400] }}>{sublabel}</Typography>
      </Box>
      <Typography sx={{ fontSize: fs(15), fontWeight: 800, color: SLATE[900] }}>{value}</Typography>
    </Box>
  )
}

export default function ProjectSettingsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { currentProject, items } = useAppSelector((state) => state.projects)

  const project = useMemo(() => {
    if (!id) return null
    return currentProject?.id === id ? currentProject : items.find((item) => item.id === id) ?? null
  }, [currentProject, id, items])

  const isOwner = Boolean(user && project?.owner_id === user.id)

  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [taskCount, setTaskCount] = useState<number | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  useEffect(() => {
    if (project) {
      setEditName(project.name)
      setEditDescription(project.description ?? '')
      setEditDueDate(project.due_date ?? '')
    }
  }, [project?.id])

  useEffect(() => {
    if (!id) return
    api.get(`/projects/${id}/members`).then((r) => setMemberCount(r.data.length)).catch(() => {})
    api.get(`/projects/${id}/tasks`, { params: { limit: 1 } }).then((r) => setTaskCount(r.data.total ?? r.data.items?.length ?? 0)).catch(() => {})
  }, [id])

  const handleSave = async () => {
    if (!project || !editName.trim()) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      await api.put(`/projects/${project.id}`, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        due_date: editDueDate || null,
      })
      dispatch(fetchProject(project.id))
      setSaveSuccess(true)
    } catch {
      setSaveError('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const canDelete = Boolean(
    project && normalizeConfirmationName(confirmName) === project.name && !deleteSubmitting,
  )

  const closeDeleteDialog = () => {
    if (deleteSubmitting) return
    setDeleteOpen(false)
    setConfirmName('')
    setDeleteError(null)
  }

  const handleDeleteProject = async () => {
    if (!project || !canDelete) return
    setDeleteSubmitting(true)
    setDeleteError(null)
    try {
      await dispatch(deleteProject(project.id)).unwrap()
      dispatch(fetchDashboard())
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setDeleteError(typeof error === 'string' ? error : 'Unable to delete project')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  if (!project) {
    return <Alert severity="info">Project settings are unavailable while the project is loading.</Alert>
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: fs(22), fontWeight: 800, color: SLATE[900] }}>Settings</Typography>
        <Typography sx={{ fontSize: fs(14), color: SLATE[500] }}>
          Manage your project details, due dates, and workspace preferences.
        </Typography>
      </Box>

      <Grid container spacing={2.5} sx={{ alignItems: 'flex-start' }}>
        <Grid size={{ xs: 12, lg: 7 }} sx={{ display: 'flex' }}>
          <Box sx={{ ...SURFACE_CARD_SX, width: '100%' }}>
            <Typography sx={{ fontSize: fs(18), fontWeight: 800, color: SLATE[900], mb: 0.5 }}>
              General Settings
            </Typography>
            <Typography sx={{ fontSize: fs(13), color: SLATE[500], mb: 3 }}>
              Update your project's name, description, and due date.
            </Typography>

            <Stack spacing={2.5}>
              <Box>
                <Typography sx={{ fontSize: fs(13), fontWeight: 600, color: SLATE[600], mb: 0.75 }}>
                  Project Name
                </Typography>
                <TextField
                  fullWidth
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!isOwner || saving}
                  placeholder="Enter project name"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
              </Box>
              <Box>
                <Typography sx={{ fontSize: fs(13), fontWeight: 600, color: SLATE[600], mb: 0.75 }}>
                  Description
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={!isOwner || saving}
                  placeholder="Enter project description"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
              </Box>
              <Box>
                <Typography sx={{ fontSize: fs(13), fontWeight: 600, color: SLATE[600], mb: 0.75 }}>
                  Due Date
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  disabled={!isOwner || saving}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
              </Box>

              {!isOwner && <Alert severity="info">Only the project owner can edit settings.</Alert>}
              {saveSuccess && <Alert severity="success" onClose={() => setSaveSuccess(false)}>Changes saved successfully.</Alert>}
              {saveError && <Alert severity="error" onClose={() => setSaveError(null)}>{saveError}</Alert>}

              {isOwner && (
                <Box>
                  <Button
                    variant="contained"
                    startIcon={<SaveOutlinedIcon />}
                    onClick={handleSave}
                    disabled={saving || !editName.trim()}
                    sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none', px: 3 }}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Box>
              )}
            </Stack>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }} sx={{ display: 'flex' }}>
          <Stack spacing={2.5} sx={{ width: '100%', height: '100%' }}>
            <Box sx={SURFACE_CARD_SX}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Box
                  sx={{
                    width: 38, height: 38, borderRadius: '10px', bgcolor: APP_PRIMARY_LIGHT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <DescriptionOutlinedIcon sx={{ fontSize: 20, color: APP_PRIMARY }} />
                </Box>
                <Typography sx={{ fontSize: fs(16), fontWeight: 800, color: SLATE[900] }}>
                  Project Summary
                </Typography>
              </Box>
              <Stack divider={<Divider />}>
                <SummaryRow
                  icon={<PeopleOutlinedIcon sx={{ fontSize: 18, color: APP_PRIMARY }} />}
                  label="Members"
                  sublabel="People working on this project"
                  value={memberCount !== null ? String(memberCount) : '—'}
                />
                <SummaryRow
                  icon={<AssignmentOutlinedIcon sx={{ fontSize: 18, color: APP_PRIMARY }} />}
                  label="Tasks"
                  sublabel="Total tasks in this project"
                  value={taskCount !== null ? String(taskCount) : '—'}
                />
                <SummaryRow
                  icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 18, color: APP_PRIMARY }} />}
                  label="Due Date"
                  sublabel="Project deadline"
                  value={project.due_date ?? 'Not set'}
                />
              </Stack>
            </Box>

            <Box
              sx={{
                ...SURFACE_CARD_SX,
                border: `1px solid #FCA5A5`,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                <Box
                  sx={{
                    width: 38, height: 38, borderRadius: '10px', bgcolor: '#FEF2F2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <ShieldOutlinedIcon sx={{ fontSize: 20, color: '#DC2626' }} />
                </Box>
                <Typography sx={{ fontSize: fs(16), fontWeight: 800, color: '#DC2626' }}>
                  Danger Zone
                </Typography>
              </Box>
              <Typography sx={{ fontSize: fs(13), color: SLATE[500], mb: 2 }}>
                Deleting a project will permanently remove it for all members.
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<DeleteForeverOutlinedIcon />}
                disabled={!isOwner}
                onClick={() => setDeleteOpen(true)}
                sx={{ fontWeight: 700, borderRadius: '10px', textTransform: 'none', py: 1.25 }}
              >
                Delete Project
              </Button>
              {!isOwner && (
                <Typography sx={{ fontSize: fs(12), color: SLATE[400], mt: 1, textAlign: 'center' }}>
                  Only the project owner can delete this project.
                </Typography>
              )}
            </Box>
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={deleteOpen} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete Project?</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <DialogContentText>
              Type the project name exactly to confirm deletion: <strong>{project.name}</strong>. This action cannot be undone.
            </DialogContentText>
            <TextField
              autoFocus
              fullWidth
              label="Project name"
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              disabled={deleteSubmitting}
            />
            {deleteError && <Alert severity="error">{deleteError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button disabled={deleteSubmitting} onClick={closeDeleteDialog}>Cancel</Button>
          <Button variant="contained" color="error" disabled={!canDelete} onClick={handleDeleteProject}>
            {deleteSubmitting ? 'Deleting...' : 'Delete Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
