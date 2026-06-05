export interface PasswordStrength {
  score: number
  feedback: string[]
  isValid: boolean
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = []

  if (password.length < 8) {
    feedback.push('At least 8 characters')
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('One uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    feedback.push('One lowercase letter')
  }
  if (!/\d/.test(password)) {
    feedback.push('One digit')
  }

  return {
    score: Math.max(0, 4 - feedback.length),
    feedback,
    isValid: feedback.length === 0,
  }
}
