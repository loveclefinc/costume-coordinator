export const EVENT_API_ALLOWED_METHODS = 'GET, POST, PUT, DELETE, OPTIONS'
export const EVENT_API_ALLOWED_HEADERS = 'Content-Type, X-Participant-Token, X-Admin-Token'

export function applyEventApiCors(
  response: Response,
  request: Request,
  allowedOriginsRaw: string | undefined,
): Response {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = (allowedOriginsRaw ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const headers = new Headers(response.headers)
  if (origin && allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Credentials', 'true')
  } else if (allowed.length === 1 && allowed[0]) {
    headers.set('Access-Control-Allow-Origin', allowed[0])
  }
  headers.set('Access-Control-Allow-Methods', EVENT_API_ALLOWED_METHODS)
  headers.set('Access-Control-Allow-Headers', EVENT_API_ALLOWED_HEADERS)
  headers.set('Vary', 'Origin')
  return new Response(response.body, { status: response.status, headers })
}
