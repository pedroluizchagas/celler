import { supabase } from '../lib/supabase.js'

function getBearerToken(req) {
  const h = req.headers?.authorization || ''
  const m = h.match(/^Bearer\s+(.*)$/i)
  if (m) return m[1]
  // cookies (opcional)
  const cookie = req.headers?.cookie || ''
  const m2 = cookie.match(/(?:^|;\s*)sb-access-token=([^;]+)/)
  if (m2) return decodeURIComponent(m2[1])
  return null
}

export async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return res.status(401).json({ error: 'Unauthorized' })
    req.user = data.user
    return next()
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

