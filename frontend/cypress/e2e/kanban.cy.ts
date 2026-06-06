describe('Kanban board', () => {
  const user = {
    id: 'user-1',
    email: 'kanban@example.com',
    full_name: 'Kanban User',
    email_verified: true,
    has_completed_onboarding: true,
    created_at: '2026-01-01T00:00:00Z',
  }

  const project = {
    id: 'proj-1',
    name: 'Test Project',
    description: null,
    course: null,
    due_date: null,
    status: 'active',
    owner_id: 'user-1',
    join_code: 'ABC123',
    join_code_expires_at: '2026-12-31T00:00:00Z',
    max_members: 6,
    member_count: 1,
    created_at: '2026-01-01T00:00:00Z',
  }

  const tasks = [
    {
      id: 'task-1',
      project_id: 'proj-1',
      title: 'Setup repo',
      description: null,
      status: 'todo',
      priority: 'high',
      due_date: null,
      verification_status: 'unverified',
      created_by: 'user-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      assignee_ids: ['user-1'],
    },
    {
      id: 'task-2',
      project_id: 'proj-1',
      title: 'Write tests',
      description: null,
      status: 'in_progress',
      priority: 'medium',
      due_date: '2026-06-15',
      verification_status: 'unverified',
      created_by: 'user-1',
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      assignee_ids: ['user-1'],
    },
  ]

  beforeEach(() => {
    cy.intercept('GET', '/api/v1/users/me', { statusCode: 200, body: user }).as('me')
    cy.intercept('GET', '/api/v1/projects', { statusCode: 200, body: [project] }).as('projects')
    cy.intercept('GET', '/api/v1/dashboard', {
      statusCode: 200,
      body: { my_tasks: [], upcoming_deadlines: [], recent_activity: [] },
    }).as('dashboard')
    cy.intercept('GET', '/api/v1/notifications*', { statusCode: 200, body: { items: [], unread_count: 0 } }).as(
      'notifications',
    )
    cy.intercept('GET', '/api/v1/projects/proj-1', { statusCode: 200, body: project }).as('project')
    cy.intercept('GET', '/api/v1/projects/proj-1/tasks*', {
      statusCode: 200,
      body: { items: tasks, next_cursor: null },
    }).as('tasks')
    cy.intercept('PATCH', '/api/v1/tasks/task-1/status', (req) => {
      req.reply({
        statusCode: 200,
        body: { ...tasks[0], status: req.body.status },
      })
    }).as('updateStatus')
    cy.intercept('GET', '/api/v1/tasks/task-1', { statusCode: 200, body: tasks[0] }).as('taskDetail')
    cy.intercept('GET', '/api/v1/tasks/task-1/subtasks', { statusCode: 200, body: [] }).as('subtasks')
    cy.intercept('GET', '/api/v1/tasks/task-1/comments', { statusCode: 200, body: [] }).as('comments')
    cy.intercept('GET', '/api/v1/tasks/task-1/time-logs', {
      statusCode: 200,
      body: { items: [], total_hours_for_user_in_project: 0 },
    }).as('timeLogs')
    cy.intercept('GET', '/api/v1/tasks/task-1/edit-requests', { statusCode: 200, body: [] }).as('editRequests')
  })

  it('displays kanban columns and opens task detail', () => {
    cy.visit('/projects/proj-1/tasks')
    cy.wait('@me')
    cy.wait('@tasks')

    cy.contains('To Do')
    cy.contains('In Progress')
    cy.contains('Review')
    cy.contains('Done')
    cy.contains('Setup repo')
    cy.contains('Write tests')

    cy.contains('Setup repo').click()
    cy.wait('@taskDetail')
    cy.contains('Task').should('not.exist')
    cy.get('[role="dialog"]').contains('Setup repo')
    cy.contains('button', 'Close').click()
  })

  it('creates a new task', () => {
    cy.intercept('POST', '/api/v1/projects/proj-1/tasks', {
      statusCode: 201,
      body: {
        id: 'task-3',
        project_id: 'proj-1',
        title: 'New task',
        description: null,
        status: 'todo',
        priority: 'medium',
        due_date: null,
        verification_status: 'unverified',
        created_by: 'user-1',
        created_at: '2026-01-03T00:00:00Z',
        updated_at: '2026-01-03T00:00:00Z',
        assignee_ids: ['user-1'],
      },
    }).as('createTask')

    cy.visit('/projects/proj-1/tasks')
    cy.wait('@tasks')

    cy.contains('button', 'Add Task').click()
    cy.get('[role="dialog"]').within(() => {
      cy.get('input').type('New task')
      cy.contains('button', 'Create').click()
    })
    cy.wait('@createTask')
    cy.contains('New task')
  })
})
