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

  const members = [
    { id: 'user-1', full_name: 'Kanban User', email: 'kanban@example.com', role: 'owner' },
    { id: 'user-2', full_name: 'Second Member', email: 'member@example.com', role: 'member' },
  ]

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
    cy.intercept('GET', '/api/v1/projects/proj-1/members', { statusCode: 200, body: members }).as('members')
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

  it('creates a task with due date, priority, and second assignee', () => {
    cy.intercept('POST', '/api/v1/projects/proj-1/tasks', (req) => {
      expect(req.body).to.include({
        title: 'Metadata task',
        priority: 'high',
        due_date: '2026-08-15',
      })
      expect(req.body.assignee_ids).to.deep.equal(['user-1', 'user-2'])
      req.reply({
        statusCode: 201,
        body: {
          id: 'task-meta',
          project_id: 'proj-1',
          title: 'Metadata task',
          description: null,
          status: 'todo',
          priority: 'high',
          due_date: '2026-08-15',
          verification_status: 'unverified',
          created_by: 'user-1',
          created_at: '2026-01-03T00:00:00Z',
          updated_at: '2026-01-03T00:00:00Z',
          assignee_ids: ['user-1', 'user-2'],
        },
      })
    }).as('createMetadataTask')

    cy.visit('/projects/proj-1/tasks')
    cy.wait('@tasks')
    cy.wait('@members')

    cy.contains('button', 'Add Task').click()
    cy.get('[role="dialog"]').within(() => {
      cy.get('label').contains(/^Title$/i).parent().find('input').type('Metadata task')
      cy.get('label').contains(/Due Date/i).parent().find('input').type('2026-08-15')
      cy.contains('[role="combobox"]', /Medium/i).click()
    })
    cy.contains('[role="option"]', 'High').click()
    cy.get('[role="dialog"]').within(() => {
      cy.get('label').contains(/Assignees/i).parent().find('[role="combobox"]').click()
    })
    cy.contains('[role="option"]', 'Second Member').click()
    cy.get('body').click(0, 0)
    cy.get('[role="dialog"]').contains('button', 'Create').click()
    cy.wait('@createMetadataTask')

    cy.contains('Metadata task')
    cy.contains('15 Aug')
    cy.contains('High')
    cy.contains('SM')
  })

  it('updates priority and due date from the task modal as owner', () => {
    const updatedTask = {
      ...tasks[0],
      priority: 'urgent',
      due_date: '2026-09-01',
    }

    cy.intercept('PUT', '/api/v1/tasks/task-1', (req) => {
      expect(req.body.priority).to.equal('urgent')
      expect(req.body.due_date).to.equal('2026-09-01')
      req.reply({ statusCode: 200, body: updatedTask })
    }).as('updateTask')

    cy.intercept('GET', '/api/v1/tasks/task-1/evidence', { statusCode: 200, body: { items: [] } }).as('evidence')
    cy.intercept('GET', '/api/v1/tasks/task-1/verifications', { statusCode: 200, body: { items: [] } }).as('verifications')
    cy.intercept('GET', '/api/v1/tasks/task-1/disputes', { statusCode: 200, body: { items: [] } }).as('disputes')
    cy.intercept('GET', '/api/v1/projects/proj-1/members', { statusCode: 200, body: members }).as('membersModal')

    cy.visit('/projects/proj-1/tasks')
    cy.wait('@tasks')

    cy.contains('Setup repo').click()
    cy.wait('@taskDetail')
    cy.wait('@membersModal')

    cy.contains('button', 'Edit Task').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('[role="combobox"]', /High/i).click()
    })
    cy.contains('[role="option"]', 'Urgent').click()
    cy.get('[role="dialog"]').within(() => {
      cy.get('label').contains(/Due Date/i).parent().find('input').clear().type('2026-09-01')
      cy.contains('button', 'Save Changes').click()
    })
    cy.wait('@updateTask')

    cy.contains('Urgent')
    cy.contains('1 Sep')
  })
})
