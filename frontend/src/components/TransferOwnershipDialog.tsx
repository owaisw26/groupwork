import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material'
import { useState } from 'react'
import api from '../services/api'
import type { Member } from './MemberCard'

interface TransferOwnershipDialogProps {
  open: boolean
  members: Member[]
  projectId: string
  currentOwnerId: string
  onClose: () => void
  onTransferred?: () => void
}

export default function TransferOwnershipDialog({
  open,
  members,
  projectId,
  currentOwnerId,
  onClose,
  onTransferred,
}: TransferOwnershipDialogProps) {
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const candidates = members.filter((m) => m.id !== currentOwnerId)

  const handleTransfer = async () => {
    setError(null)
    try {
      await api.post(`/projects/${projectId}/transfer-ownership`, { new_owner_id: selectedId })
      onTransferred?.()
      onClose()
    } catch {
      setError('Unable to transfer ownership')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Transfer Ownership</DialogTitle>
      <DialogContent>
        <TextField
          select
          fullWidth
          label="New owner"
          margin="normal"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {candidates.map((member) => (
            <MenuItem key={member.id} value={member.id}>{member.full_name}</MenuItem>
          ))}
        </TextField>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleTransfer} disabled={!selectedId}>
          Transfer
        </Button>
      </DialogActions>
    </Dialog>
  )
}
