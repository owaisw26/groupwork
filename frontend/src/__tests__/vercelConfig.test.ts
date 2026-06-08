import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('vercel.json', () => {
  it('proxies /api requests to the Render backend', () => {
    const configPath = resolve(__dirname, '../../vercel.json')
    const config = JSON.parse(readFileSync(configPath, 'utf8')) as {
      rewrites: Array<{ source: string; destination: string }>
    }

    const apiRewrite = config.rewrites.find((rule) => rule.source === '/api/:path*')
    expect(apiRewrite).toBeDefined()
    expect(apiRewrite?.destination).toMatch(/^https:\/\/.*\.onrender\.com\/api\/:path\*$/)
  })
})
