describe('Auth flow', () => {
  const email = 'e2e-user@example.com'
  const password = 'Password1'

  it('completes register, verify, login, dashboard, and logout with mocked API', () => {
    cy.intercept('POST', '/api/v1/auth/register', {
      statusCode: 201,
      body: {
        id: '1',
        email,
        full_name: 'E2E User',
        email_verified: false,
        has_completed_onboarding: false,
        created_at: '2026-01-01T00:00:00Z',
      },
    }).as('register')

    cy.intercept('POST', '/api/v1/auth/verify-email', {
      statusCode: 200,
      body: { email_verified: true, email },
    }).as('verify')

    cy.intercept('POST', '/api/v1/auth/login', {
      statusCode: 200,
      body: {
        id: '1',
        email,
        full_name: 'E2E User',
        email_verified: true,
        has_completed_onboarding: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    }).as('login')

    cy.intercept('GET', '/api/v1/users/me', {
      statusCode: 200,
      body: {
        id: '1',
        email,
        full_name: 'E2E User',
        email_verified: true,
        has_completed_onboarding: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    }).as('me')

    cy.intercept('POST', '/api/v1/auth/logout', { statusCode: 200, body: { status: 'ok' } }).as(
      'logout',
    )

    cy.visit('/register')
    cy.get('input[name="full_name"]').type('E2E User')
    cy.get('input[name="email"]').type(email)
    cy.get('input[name="password"]').type(password)
    cy.get('input[name="confirmPassword"]').type(password)
    cy.contains('button', 'Create Account').click()
    cy.wait('@register')
    cy.contains('check your email', { matchCase: false })

    cy.visit('/verify-email/test-token')
    cy.wait('@verify')
    cy.contains('verified', { matchCase: false })

    cy.visit('/login')
    cy.get('input[name="email"]').type(email)
    cy.get('input[name="password"]').type(password)
    cy.contains('button', 'Log In').click()
    cy.wait('@login')
    cy.url().should('include', '/dashboard')
    cy.contains('Dashboard')

    cy.get('[aria-label="user menu"]').click()
    cy.contains('Logout').click()
    cy.wait('@logout')
    cy.url().should('include', '/login')
  })
})
