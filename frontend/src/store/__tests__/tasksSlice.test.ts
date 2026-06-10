import { describe, expect, it } from 'vitest'
import tasksReducer, {
  applyOptimisticTaskStatus,
  restoreOptimisticTask,
  type Task,
  type TasksState,
} from '../tasksSlice'

const task: Task = {
  id: 'task-1',
  project_id: 'project-1',
  title: 'Prepare report',
  description: null,
  status: 'todo',
  priority: 'medium',
  due_date: null,
  verification_status: 'none',
  created_by: 'user-1',
  created_at: '2026-06-10T00:00:00Z',
  updated_at: '2026-06-10T00:00:00Z',
  assignee_ids: ['user-1'],
}

const initialState: TasksState = {
  items: [task],
  myTasks: [{ ...task }],
  searchResults: [],
  currentTask: { ...task },
  activeDetailTaskId: 'task-1',
  lastSearchQuery: '',
  myTasksLoading: false,
  subtasks: [],
  comments: [],
  timeLogs: [],
  totalProjectHours: 0,
  editRequests: [],
  isLoading: false,
  error: null,
}

describe('tasksSlice optimistic status updates', () => {
  it('moves a task immediately before the server response returns', () => {
    const state = tasksReducer(
      initialState,
      applyOptimisticTaskStatus({ taskId: 'task-1', status: 'in_progress' }),
    )

    expect(state.items[0].status).toBe('in_progress')
    expect(state.myTasks[0].status).toBe('in_progress')
    expect(state.currentTask?.status).toBe('in_progress')
  })

  it('marks review tasks as pending verification optimistically', () => {
    const state = tasksReducer(
      initialState,
      applyOptimisticTaskStatus({ taskId: 'task-1', status: 'review' }),
    )

    expect(state.items[0].status).toBe('review')
    expect(state.items[0].verification_status).toBe('pending')
  })

  it('restores the original task when an optimistic move fails', () => {
    const moved = tasksReducer(
      initialState,
      applyOptimisticTaskStatus({ taskId: 'task-1', status: 'review' }),
    )
    const restored = tasksReducer(moved, restoreOptimisticTask(task))

    expect(restored.items[0].status).toBe('todo')
    expect(restored.items[0].verification_status).toBe('none')
  })
})
