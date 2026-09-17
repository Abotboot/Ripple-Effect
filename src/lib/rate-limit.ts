interface RateLimitOptions {
  windowMs: number
  max: number
}

const tracker = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  key: string,
  options: RateLimitOptions = { windowMs: 10 * 60 * 1000, max: 5 }
): boolean {
  const now = Date.now()
  const record = tracker.get(key)

  if (!record || now > record.resetAt) {
    tracker.set(key, { count: 1, resetAt: now + options.windowMs })
    return true
  }

  if (record.count >= options.max) {
    return false
  }

  record.count += 1
  return true
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of tracker.entries()) {
      if (now > record.resetAt) {
        tracker.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}
