const hasStorage = (type) => {
  try {
    return typeof window !== 'undefined' && !!window[type]
  } catch {
    return false
  }
}

const make = (type) => ({
  read(key, fallback = null) {
    if (!hasStorage(type)) return fallback
    try {
      const raw = window[type].getItem(key)
      return raw === null ? fallback : JSON.parse(raw)
    } catch {
      return fallback
    }
  },
  write(key, value) {
    if (!hasStorage(type)) return false
    try {
      window[type].setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },
  remove(key) {
    if (!hasStorage(type)) return
    try {
      window[type].removeItem(key)
    } catch {
      /* storage unavailable */
    }
  },
})

export const local = make('localStorage')
export const session = make('sessionStorage')
