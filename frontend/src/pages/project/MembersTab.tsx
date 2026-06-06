import { Box, Button, Grid, Paper, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import InviteMemberForm from '../../components/InviteMemberForm'
import MemberCard, { type Member } from '../../components/MemberCard'
import TransferOwnershipDialog from '../../components/TransferOwnershipDialog'
import api from '../../services/api'
import { useAppSelector } from '../../store/hooks'

export default function MembersTab() {
  const { id } = useParams()
  const user = useAppSelector((state) => state.auth.user)
  const currentProject = useAppSelector((state) =>
    state.projects.items.find((p) => p.id === id) ?? state.projects.currentProject,
  )
  const [members, setMembers] = useState<Member[]>([])
  const [transferOpen, setTransferOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    api.get<Member[]>(`/projects/${id}/members`).then((response) => {
      if (!cancelled) setMembers(response.data)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  const loadMembers = async () => {
    if (!id) return
    const response = await api.get<Member[]>(`/projects/${id}/members`)
    setMembers(response.data)
  }

  const isOwner = currentProject?.owner_id === user?.id

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="h6" gutterBottom>Members</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Invite Member</Typography>
            <InviteMemberForm projectId={id!} onInvited={loadMembers} />
          </Paper>
          {isOwner && currentProject && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Join Code</Typography>
              <Typography variant="h4" sx={{ letterSpacing: 4, mb: 1 }}>
                {currentProject.join_code}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Expires {new Date(currentProject.join_code_expires_at).toLocaleDateString()}
              </Typography>
              <Button variant="outlined" onClick={() => setTransferOpen(true)}>
                Transfer Ownership
              </Button>
            </Paper>
          )}
        </Grid>
      </Grid>
      {currentProject && user && (
        <TransferOwnershipDialog
          open={transferOpen}
          members={members}
          projectId={id!}
          currentOwnerId={user.id}
          onClose={() => setTransferOpen(false)}
          onTransferred={loadMembers}
        />
      )}
    </Box>
  )
}
