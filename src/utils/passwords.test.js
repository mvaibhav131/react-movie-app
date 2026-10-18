import { describe, expect, it } from 'vitest'
import { constantTimeEqual, generateSalt, hashPassword } from './passwords'

describe('password hashing', () => {
  it('derives the same hash for the same password and salt', async () => {
    const salt = generateSalt()
    const a = await hashPassword('correct horse battery staple', salt)
    const b = await hashPassword('correct horse battery staple', salt)
    expect(a).toBe(b)
    expect(a).not.toContain('correct')
  })

  it('differs when the salt or the password differs', async () => {
    const s1 = generateSalt()
    const s2 = generateSalt()
    expect(s1).not.toBe(s2)
    expect(await hashPassword('secret123', s1)).not.toBe(await hashPassword('secret123', s2))
    expect(await hashPassword('secret123', s1)).not.toBe(await hashPassword('secret124', s1))
  })

  it('compares in constant time and rejects mismatched lengths', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true)
    expect(constantTimeEqual('abc', 'abd')).toBe(false)
    expect(constantTimeEqual('abc', 'abcd')).toBe(false)
    expect(constantTimeEqual('abc', undefined)).toBe(false)
  })
})
