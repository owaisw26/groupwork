import { Alert, Box, Button, LinearProgress, Typography } from '@mui/material'
import { useRef, useState } from 'react'
import api from '../services/api'

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx', '.txt', '.zip']
const MAX_FILE_SIZE = 5 * 1024 * 1024

interface EvidenceUploadProps {
  taskId: string
  onUploaded?: () => void
}

export default function EvidenceUpload({ taskId, onUploaded }: EvidenceUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError(`File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`)
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File exceeds maximum size of 5MB')
      return
    }

    setError(null)
    setUploading(true)
    setProgress(10)

    try {
      const requestResponse = await api.post(`/tasks/${taskId}/evidence`, {
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
        file_size: file.size,
      })
      setProgress(30)

      const { upload_url, evidence_id } = requestResponse.data
      await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })
      setProgress(80)

      await api.post(`/tasks/${taskId}/evidence/confirm`, {
        evidence_id,
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
        file_size: file.size,
      })
      setProgress(100)
      onUploaded?.()
    } catch {
      setError('Failed to upload evidence. Please try again.')
    } finally {
      setUploading(false)
      setProgress(0)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS.join(',')}
        hidden
        onChange={handleFileSelect}
      />
      <Button
        variant="outlined"
        size="small"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        Upload Evidence
      </Button>
      {uploading && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="caption" color="text.secondary">
            Uploading...
          </Typography>
        </Box>
      )}
    </Box>
  )
}
