import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import { useState } from 'react'
import { APP_BORDER, APP_PRIMARY, APP_PRIMARY_LIGHT, fs, SLATE } from '../appTheme'
import { useAppDispatch } from '../store/hooks'
import { createProject } from '../store/projectsSlice'
import { getTodayDateInputValue } from '../utils/dateInput'

interface CreateProjectDialogProps {
  open: boolean
  onClose: () => void
}

const dialogPaperSx = {
  borderRadius: '18px',
  border: `1px solid ${APP_BORDER}`,
  boxShadow: '0 28px 70px rgba(15, 23, 42, 0.22)',
}

const fieldSx = {
  '& .MuiInputLabel-root': {
    color: SLATE[700],
    fontWeight: 800,
    fontSize: fs(12),
  },
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    bgcolor: '#FFFFFF',
    '& fieldset': { borderColor: APP_BORDER },
    '&:hover fieldset': { borderColor: '#CBD5E1' },
    '&.Mui-focused fieldset': { borderColor: APP_PRIMARY, borderWidth: 1.5 },
  },
  '& .MuiFormHelperText-root': {
    ml: 0,
    mt: 0.75,
    color: SLATE[500],
    fontSize: fs(10),
  },
}

export default function CreateProjectDialog({ open, onClose }: CreateProjectDialogProps) {
  const dispatch = useAppDispatch()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [course, setCourse] = useState('')
  const [dueDate, setDueDate] = useState(getTodayDateInputValue)
  const [maxMembers, setMaxMembers] = useState('6')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setName('')
    setDescription('')
    setCourse('')
    setDueDate(getTodayDateInputValue())
    setMaxMembers('6')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await dispatch(
        createProject({
          name: name.trim(),
          description: description.trim() || undefined,
          course: course.trim() || undefined,
          due_date: dueDate || undefined,
          max_members: Number(maxMembers),
        }),
      )
      if (createProject.rejected.match(result)) {
        setError((result.payload as string) ?? 'Unable to create project')
        return
      }
      handleClose()
    } catch {
      setError('Unable to create project')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: dialogPaperSx } }}
    >
      <DialogTitle sx={{ px: 3, pt: 2.75, pb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              bgcolor: APP_PRIMARY_LIGHT,
              color: APP_PRIMARY,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FolderOutlinedIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography component="h2" sx={{ fontSize: fs(22), fontWeight: 900, color: SLATE[900], lineHeight: 1.15 }}>
              Create Project
            </Typography>
            <Typography sx={{ mt: 0.6, fontSize: fs(11), color: SLATE[500], fontWeight: 600 }}>
              Set up a workspace for tasks, meetings, and collaboration.
            </Typography>
          </Box>
        </Box>
        <Button
          aria-label="Close"
          onClick={handleClose}
          sx={{ minWidth: 0, p: 0.75, color: SLATE[500], borderRadius: '10px' }}
        >
          <CloseOutlinedIcon sx={{ fontSize: 20 }} />
        </Button>
      </DialogTitle>
      <DialogContent sx={{ px: 3, py: 0 }}>
        <Box sx={{ display: 'grid', gap: 2.1, pt: 0.5 }}>
          <TextField
            fullWidth
            label="Project name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            helperText="Choose a clear, descriptive name for your project."
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            minRows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            helperText="Provide a brief overview of the project goals and deliverables."
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Course"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            helperText="Select the course this project belongs to."
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            helperText="Set the due date for the project."
            slotProps={{ inputLabel: { shrink: true } }}
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Max members"
            type="number"
            value={maxMembers}
            onChange={(e) => setMaxMembers(e.target.value)}
            helperText="Choose the maximum number of teammates allowed."
            slotProps={{ htmlInput: { min: 2, max: 20 } }}
            sx={fieldSx}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: 1.5,
              py: 1.25,
              borderRadius: '10px',
              border: `1px solid #BFDBFE`,
              bgcolor: APP_PRIMARY_LIGHT,
            }}
          >
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                bgcolor: '#FFFFFF',
                color: APP_PRIMARY,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldOutlinedIcon sx={{ fontSize: 16 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: fs(12), fontWeight: 900, color: SLATE[800] }}>
                Project visibility
              </Typography>
              <Typography sx={{ fontSize: fs(10), color: SLATE[500], fontWeight: 600 }}>
                This project will be visible to project members only.
              </Typography>
            </Box>
          </Box>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: '10px' }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, mt: 2, borderTop: `1px solid ${APP_BORDER}` }}>
        <Button
          onClick={handleClose}
          sx={{
            borderRadius: '10px',
            px: 2.25,
            color: SLATE[700],
            border: `1px solid ${APP_BORDER}`,
            fontWeight: 800,
            textTransform: 'none',
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!name.trim() || isSubmitting}
          sx={{ borderRadius: '10px', px: 2.5, fontWeight: 900, textTransform: 'none' }}
        >
          Create Project
        </Button>
      </DialogActions>
    </Dialog>
  )
}
