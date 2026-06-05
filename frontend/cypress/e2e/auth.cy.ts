describe('Auth flow', () => {
  const email = `e2e-${Date.now()}@example.com`
  const password = 'Password1'

  it('registers, verifies email, logs in, sees dashboard, and logs out', () => {
    cy.visit('/register')
    cy.get('input[name="full_name"]').type('E2E User')
    cy.get('input[name="email"]').type(email)
    cy.get('input[name="password"]').type(password)
    cy.get('input[name="confirmPassword"]').type(password)
    cy.contains('button', 'Create Account').click()
    cy.contains('check your email', { matchCase: false })

    cy.task('getVerificationToken', email).then((token) => {
      cy.visit(`/verify-email/${token}`)
      cy.contains('verified', { matchCase: false })
    })

    cy.visit('/login')
    cy.get('input[name="email"]').type(email)
    cy.get('input[name="password"]').type(password)
    cy.contains('button', 'Log In').click()
    cy.url().should('include', '/dashboard')
    cy.contains('Dashboard')

    cy.get('[aria-label="user menu"]').click()
    cy.contains('Logout').click()
    cy.url().should('include', '/login')
  })
})
