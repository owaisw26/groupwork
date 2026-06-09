import { describe, expect, it } from 'vitest'
import vercelConfig from '../../vercel.json'

describe('vercel.json', () => {
  it('proxies /api requests to the Render backend', () => {
    const apiRewrite = vercelConfig.rewrites.find((rule) => rule.source === '/api/:path*')
    expect(apiRewrite).toBeDefined()
    expect(apiRewrite?.destination).toMatch(/^https:\/\/.*\.onrender\.com\/api\/:path\*$/)
  })

  it('serves the SPA for direct app routes', () => {
    const appRewrite = vercelConfig.rewrites.find((rule) => rule.source === '/:path*')
    expect(appRewrite?.destination).toBe('/index.html')
  })
})
