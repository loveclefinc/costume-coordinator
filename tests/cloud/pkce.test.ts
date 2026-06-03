import { describe, it, expect } from 'vitest'
import { generatePkcePair, base64UrlEncode } from '../../src/cloud/oauth/pkce'

describe('PKCE', () => {
  it('generates verifier and S256 challenge', async () => {
    const pair = await generatePkcePair()
    expect(pair.codeVerifier.length).toBeGreaterThanOrEqual(43)
    expect(pair.codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(pair.codeChallenge).not.toContain('+')
    expect(pair.codeChallenge).not.toContain('=')
  })

  it('base64UrlEncode produces URL-safe string', () => {
    const bytes = new Uint8Array([0, 1, 2, 255])
    const encoded = base64UrlEncode(bytes)
    expect(encoded).not.toMatch(/[+/=]/)
  })
})
