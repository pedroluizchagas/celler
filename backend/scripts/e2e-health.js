#!/usr/bin/env node
/*
 End-to-end health checker
 - OPTIONS /api/produtos
 - POST /api/produtos (creates a test item)
 - GET /api/ordens/stats (RPC-backed dashboard)
 Validates status codes and key fields. Exits non-zero on failure.
 Usage:
   BASE_URL=https://your-host node scripts/e2e-health.js
   or: node scripts/e2e-health.js --base https://your-host --timeout 10000
*/

const { randomUUID } = require('crypto')

const args = process.argv.slice(2)
const getArg = (name, def) => {
  const idx = args.indexOf(`--${name}`)
  if (idx !== -1 && args[idx + 1]) return args[idx + 1]
  return def
}

const BASE_URL = getArg('base', process.env.BASE_URL || 'http://localhost:3001')
const TIMEOUT = parseInt(getArg('timeout', process.env.TIMEOUT || '10000'), 10)

function hr(ms) {
  return `${ms.toFixed(0)}ms`
}

async function http(method, path, body) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), TIMEOUT)
  const started = Date.now()
  const id = randomUUID()
  const url = `${BASE_URL}${path}`
  const headers = { 'x-request-id': id }
  let payload
  if (body !== undefined) {
    headers['content-type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  try {
    const res = await fetch(url, { method, headers, body: payload, signal: controller.signal })
    const text = await res.text()
    let json
    try { json = text ? JSON.parse(text) : undefined } catch { json = undefined }
    const elapsed = Date.now() - started
    return { res, json, text, elapsed, requestId: id }
  } finally {
    clearTimeout(t)
  }
}

function expect(cond, msg) {
  if (!cond) {
    throw new Error(msg)
  }
}

async function main() {
  console.log(`➡️  Checking API at ${BASE_URL} (timeout ${TIMEOUT}ms)`) 

  // 1) OPTIONS /api/produtos
  const opt = await http('OPTIONS', '/api/produtos')
  console.log(`OPTIONS /api/produtos -> ${opt.res.status} in ${hr(opt.elapsed)}`)
  expect(opt.res.status === 204, `Expected 204 on OPTIONS, got ${opt.res.status}`)

  // 2) POST /api/produtos
  const stamp = new Date().toISOString().replace(/[:.TZ-]/g, '')
  const produto = {
    nome: `HEALTHCHECK-${stamp}`,
    tipo: 'peca',
    preco_custo: 0,
    preco_venda: 0,
    margem_lucro: 0,
    estoque_atual: 0,
    estoque_minimo: 0,
    estoque_maximo: 0,
    descricao: null,
    codigo_barras: `HC-${stamp}`,
    codigo_interno: `HC-${stamp}`,
    categoria_id: null,
    fornecedor_id: null,
    localizacao: null,
    ativo: true,
  }
  const post = await http('POST', '/api/produtos', produto)
  console.log(`POST /api/produtos -> ${post.res.status} in ${hr(post.elapsed)} (x-request-id ${post.requestId})`)
  expect(post.res.status === 201, `Expected 201 on POST /api/produtos, got ${post.res.status}. Body: ${post.text}`)
  expect(post.json && post.json.id, 'POST did not return created id')
  expect(post.json && post.json.nome === produto.nome, 'POST returned unexpected nome')

  // 3) GET /api/ordens/stats
  const stats = await http('GET', '/api/ordens/stats')
  console.log(`GET /api/ordens/stats -> ${stats.res.status} in ${hr(stats.elapsed)}`)
  expect(stats.res.status === 200, `Expected 200 on GET /api/ordens/stats, got ${stats.res.status}`)
  expect(stats.json && stats.json.success === true, 'Dashboard response missing success=true')
  expect(stats.json && stats.json.data && stats.json.data.totais, 'Dashboard response missing data.totais')

  console.log('✅ Healthcheck passed: OPTIONS/POST (produtos) and dashboard RPC OK')
}

(async () => {
  try {
    // Ensure global fetch (Node >=18), else load node-fetch
    if (typeof fetch !== 'function') {
      global.fetch = (await import('node-fetch')).default
    }
    await main()
    process.exit(0)
  } catch (err) {
    console.error('❌ Healthcheck failed:', err.message)
    if (err.stack) console.error(err.stack)
    process.exit(1)
  }
})()

