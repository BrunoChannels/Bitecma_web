import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function mockJsonResponse(payload, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload
    },
  }
}

async function apiRequest(baseUrl, path, { method = 'GET', body, token } = {}) {
  const url = `${String(baseUrl).replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`
  const headers = {}
  if (body != null) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

describe('API endpoints (fetch requests)', () => {
  const baseUrl = 'http://test.local'

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => mockJsonResponse({ ok: true, data: [] })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('hace GET a /ping', async () => {
    await apiRequest(baseUrl, '/ping')
    expect(fetch).toHaveBeenCalledWith(`${baseUrl}/ping`, expect.objectContaining({ method: 'GET' }))
  })

  it('hace POST a /auth/login con JSON', async () => {
    await apiRequest(baseUrl, '/auth/login', {
      method: 'POST',
      body: { correo: 'a@a.cl', password: 'secret' },
    })

    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/auth/login`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })

  it('hace GET a /auth/me con Authorization', async () => {
    await apiRequest(baseUrl, '/auth/me', { token: 'token123' })
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/auth/me`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer token123' }),
      }),
    )
  })

  it('hace GET a todos los resources configurados', async () => {
    const resources = [
      '/organizaciones',
      '/especies',
      '/evaluaciones',
      '/usuarios',
      '/sectores',
      '/botes',
      '/regiones',
      '/operaciones',
    ]

    for (const path of resources) await apiRequest(baseUrl, path)

    for (const path of resources) {
      expect(fetch).toHaveBeenCalledWith(`${baseUrl}${path}`, expect.objectContaining({ method: 'GET' }))
    }
  })
})

