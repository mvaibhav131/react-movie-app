const ITERATIONS = 150_000

const toBase64 = (buffer) => {
  let binary = ''
  new Uint8Array(buffer).forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

const fromBase64 = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0))

export const generateSalt = () => toBase64(crypto.getRandomValues(new Uint8Array(16)))

/** PBKDF2-SHA256 hash of the password, base64 encoded. */
export const hashPassword = async (password, salt) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(salt), iterations: ITERATIONS },
    key,
    256
  )
  return toBase64(bits)
}

export const constantTimeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
