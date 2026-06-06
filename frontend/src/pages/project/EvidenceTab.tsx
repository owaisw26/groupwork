import {
  Alert,
  Box,
  CircularProgress,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../services/api'

interface EvidenceItem {
  id: string
  original_filename: string
  file_size: number
  mime_type: string
  uploaded_at: string
  user_name?: string
  task_title?: string
  task_id: string
  download_url?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function EvidenceTab() {
  const { id: projectId } = useParams()
  const [items, setItems] = useState<EvidenceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEvidence = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`/projects/${projectId}/evidence`)
      setItems(response.data.items ?? [])
    } catch {
      setError('Failed to load evidence files')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadEvidence()
  }, [loadEvidence])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Evidence
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {items.length === 0 ? (
        <Typography color="text.secondary">No evidence files uploaded yet.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Filename</TableCell>
              <TableCell>Task</TableCell>
              <TableCell>Uploaded By</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Size</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.download_url ? (
                    <Link href={item.download_url} target="_blank" rel="noopener noreferrer">
                      {item.original_filename}
                    </Link>
                  ) : (
                    item.original_filename
                  )}
                </TableCell>
                <TableCell>{item.task_title ?? item.task_id}</TableCell>
                <TableCell>{item.user_name ?? '—'}</TableCell>
                <TableCell>{new Date(item.uploaded_at).toLocaleDateString()}</TableCell>
                <TableCell align="right">{formatFileSize(item.file_size)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  )
}
