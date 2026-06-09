import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { APP_BORDER, fs, SLATE, SURFACE_CARD_SX } from '../../appTheme'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { deleteProject, fetchDashboard } from '../../store/projectsSlice'

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

export default function ProjectSettingsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { currentProject, items } = useAppSelector((state) => state.projects)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const project = useMemo(() => {
    if (!id) return null
    return currentProject?.id === id ? currentProject : items.find((item) => item.id === id) ?? null
  }, [currentProject, id, items])

  const isOwner = Boolean(user && project?.owner_id === user.id)
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
    return (
      <Alert severity="info">
        Project settings are unavailable while the project is loading.
      </Alert>
    )
  }

  return (
    <Stack spacing={3}>
      <Box sx={SURFACE_CARD_SX}>
        <Typography sx={{ fontSize: fs(20), fontWeight: 800, color: SLATE[900], mb: 1 }}>
          Project Settings
        </Typography>
        <Typography sx={{ fontSize: fs(14), color: SLATE[500] }}>
          Manage project-level actions for {project.name}.
        </Typography>
      </Box>

      <Box
        sx={{
          ...SURFACE_CARD_SX,
          borderColor: '#FCA5A5',
          boxShadow: '0 8px 30px rgba(185, 28, 28, 0.08)',
        }}
      >
        <Stack spacing={2}>
          <Box>
            <Typography sx={{ fontSize: fs(18), fontWeight: 800, color: '#991B1B', mb: 0.5 }}>
              Danger Zone
            </Typography>
            <Typography sx={{ fontSize: fs(14), color: SLATE[500], maxWidth: 720 }}>
              Delete this project if it was created by mistake. This removes it from member project lists and cannot be undone.
            </Typography>
          </Box>

          {!isOwner && (
            <Alert severity="info" sx={{ maxWidth: 720 }}>
              Only the project owner can delete this project.
            </Alert>
          )}

          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              border: `1px solid ${APP_BORDER}`,
              borderRadius: '12px',
              p: 2,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: fs(15), fontWeight: 800, color: SLATE[900] }}>
                Delete Project
              </Typography>
              <Typography sx={{ fontSize: fs(13), color: SLATE[500] }}>
                Permanently close access to this project workspace.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForeverOutlinedIcon />}
              disabled={!isOwner}
              onClick={() => setDeleteOpen(true)}
              sx={{ flexShrink: 0 }}
            >
              Delete Project
            </Button>
          </Box>
        </Stack>
      </Box>

      <Dialog open={deleteOpen} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete Project?</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <DialogContentText>
              Type the project name exactly to confirm deletion: {project.name}. This action cannot be undone.
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
          <Button disabled={deleteSubmitting} onClick={closeDeleteDialog}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!canDelete}
            onClick={handleDeleteProject}
          >
            {deleteSubmitting ? 'Deleting...' : 'Delete Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
