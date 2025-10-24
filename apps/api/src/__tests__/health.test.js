import request from 'supertest'
import { describe, it, expect } from 'vitest'
import { app } from '../index.js'

describe('Healthcheck', () => {
  it('GET /api/health should return ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('ok', true)
  })
})

