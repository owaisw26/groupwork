import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TaskCard from '../TaskCard'
import type { Task } from '../../store/tasksSlice'

vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
}))

const baseTask: Task = {
  id: 'task-1',
  project_id: 'proj-1',
  title: 'Write docs',
  description: null,
  status: 'todo',
  priority: 'high',
  due_date: null,
  verification_status: 'unverified',
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  assignee_ids: [],
}

const members = [
  { id: 'user-1', full_name: 'Alice Owner' },
  { id: 'user-2', full_name: 'Bob Member' },
]

describe('TaskCard', () => {
  it('renders due date when task.due_date is set', () => {
    render(
      <TaskCard
        task={{ ...baseTask, due_date: '2026-08-20' }}
        members={members}
        onClick={() => {}}
      />,
    )

    expect(screen.getByText('20 Aug')).toBeInTheDocument()
  })

  it('omits due date row when task.due_date is null', () => {
    render(<TaskCard task={baseTask} members={members} onClick={() => {}} />)

    expect(screen.queryByTestId('task-card-due-date')).not.toBeInTheDocument()
  })

  it('renders real assignee initials from members prop', () => {
    render(
      <TaskCard
        task={{ ...baseTask, assignee_ids: ['user-1', 'user-2'] }}
        members={members}
        onClick={() => {}}
      />,
    )

    expect(screen.getByText('AO')).toBeInTheDocument()
    expect(screen.getByText('BM')).toBeInTheDocument()
    expect(screen.queryByText('A')).not.toBeInTheDocument()
  })

  it('reflects completedSubtasks and totalSubtasks in progress label', () => {
    render(
      <TaskCard
        task={baseTask}
        members={members}
        completedSubtasks={2}
        totalSubtasks={5}
        onClick={() => {}}
      />,
    )

    expect(screen.getByText('2 / 5')).toBeInTheDocument()
  })
})
