import { describe, expect, it } from 'vitest'
import { addDaysISO, compareReleaseAsc, compareReleaseDesc, isReleased, isUpcoming, todayISO, validDate, yearOf } from './dates'

describe('validDate', () => {
  it('accepts ISO dates and trims timestamps', () => {
    expect(validDate('2026-10-18')).toBe('2026-10-18')
    expect(validDate('2026-10-18T12:00:00Z')).toBe('2026-10-18')
  })

  it('rejects missing, malformed and implausible values', () => {
    expect(validDate('')).toBeNull()
    expect(validDate(undefined)).toBeNull()
    expect(validDate('0000-00-00')).toBeNull()
    expect(validDate('2026-13-01')).toBeNull()
    expect(validDate('1200-01-01')).toBeNull()
    expect(validDate('18/10/2026')).toBeNull()
  })

  it('extracts a year', () => {
    expect(yearOf('1999-05-06')).toBe(1999)
    expect(yearOf(null)).toBeNull()
  })
})

describe('release state', () => {
  it('separates released from upcoming titles', () => {
    expect(isReleased('2026-10-18', '2026-10-18')).toBe(true)
    expect(isReleased('2026-10-19', '2026-10-18')).toBe(false)
    expect(isUpcoming('2026-10-19', '2026-10-18')).toBe(true)
    expect(isUpcoming('2026-10-18', '2026-10-18')).toBe(false)
  })

  it('never treats an unknown date as released or upcoming', () => {
    expect(isReleased('')).toBe(false)
    expect(isUpcoming(undefined)).toBe(false)
  })

  it('adds days across month boundaries', () => {
    expect(addDaysISO('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28')
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('release comparators', () => {
  const items = [
    { id: 1, releaseDate: '2024-01-01', popularity: 10 },
    { id: 2, releaseDate: null, popularity: 999 },
    { id: 3, releaseDate: '2026-05-05', popularity: 1 },
    { id: 4, releaseDate: '2024-01-01', popularity: 50 },
    { id: 5, releaseDate: 'garbage', popularity: 5 },
  ]

  it('puts the newest release first and undated titles last', () => {
    const ids = [...items].sort(compareReleaseDesc).map((i) => i.id)
    expect(ids.slice(0, 3)).toEqual([3, 4, 1])
    expect(ids.slice(3).sort()).toEqual([2, 5])
  })

  it('breaks date ties by popularity', () => {
    const ids = [...items].sort(compareReleaseDesc).map((i) => i.id)
    expect(ids.indexOf(4)).toBeLessThan(ids.indexOf(1))
  })

  it('sorts oldest first for year ascending', () => {
    const ids = [...items].sort(compareReleaseAsc).map((i) => i.id)
    expect(ids[0]).toBe(1)
    expect(ids[2]).toBe(3)
  })
})
