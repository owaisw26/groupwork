import {
  Alert,
  Link,
  Paper,
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) {
      return
    }
    api
      .get(`/projects/${projectId}/evidence`)
      .then((response) => {
        setItems(response.data.items ?? [])
        setError(null)
      })
      .catch(() => {
        setError('Failed to load evidence files')
      })
  }, [projectId])

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
