import { describe, expect, it } from 'vitest'
import { buildDiscoverParams } from './discover'

const TODAY = '2026-10-18'

describe('buildDiscoverParams', () => {
  it('orders movies by primary release date and excludes unreleased titles', () => {
    const p = buildDiscoverParams({ mediaType: 'movie', sort: 'latest', today: TODAY })
    expect(p.sort_by).toBe('primary_release_date.desc')
    expect(p['primary_release_date.lte']).toBe(TODAY)
    expect(p['with_runtime.gte']).toBe(60)
  })

  it('uses first_air_date for TV (release_date.* is not valid there)', () => {
    const p = buildDiscoverParams({ mediaType: 'tv', sort: 'latest', today: TODAY })
    expect(p.sort_by).toBe('first_air_date.desc')
    expect(p['first_air_date.lte']).toBe(TODAY)
    expect(p['primary_release_date.lte']).toBeUndefined()
    expect(p['with_runtime.gte']).toBeUndefined()
  })

  it('keeps the released-only cap even when an `until` date is in the future', () => {
    expect(buildDiscoverParams({ until: '2030-01-01', today: TODAY })['primary_release_date.lte']).toBe(TODAY)
    expect(buildDiscoverParams({ until: '1999-12-31', today: TODAY })['primary_release_date.lte']).toBe('1999-12-31')
  })

  it('builds an upcoming query that starts tomorrow and never mixes in released titles', () => {
    const p = buildDiscoverParams({ upcoming: true, sort: 'popularity', today: TODAY })
    expect(p['primary_release_date.gte']).toBe('2026-10-19')
    expect(p['primary_release_date.lte']).toBeUndefined()
    expect(p.with_release_type).toBe('2|3')
    expect(p['vote_count.gte']).toBeUndefined()
  })

  it('filters by original language, genres (OR) and year', () => {
    const p = buildDiscoverParams({ language: 'mr', genres: [35, 18], year: 2024, today: TODAY })
    expect(p.with_original_language).toBe('mr')
    expect(p.with_genres).toBe('35|18')
    expect(p.primary_release_year).toBe(2024)
    expect(buildDiscoverParams({ mediaType: 'tv', year: 2024, today: TODAY }).first_air_date_year).toBe(2024)
  })

  it('requires a vote floor for rating sorts, scaled to catalogue size', () => {
    expect(buildDiscoverParams({ sort: 'rating', today: TODAY })['vote_count.gte']).toBe(300)
    expect(buildDiscoverParams({ sort: 'rating', language: 'ta', today: TODAY })['vote_count.gte']).toBe(50)
    expect(buildDiscoverParams({ sort: 'rating', language: 'mr', today: TODAY })['vote_count.gte']).toBe(10)
    expect(buildDiscoverParams({ sort: 'latest', today: TODAY })['vote_count.gte']).toBe(1)
  })

  it('restricts web-series discovery to Indian OTT providers and scripted series', () => {
    const p = buildDiscoverParams({ mediaType: 'tv', ott: true, today: TODAY })
    expect(p.watch_region).toBe('IN')
    expect(p.with_watch_providers.split('|')).toContain('2336')
    expect(p.with_type).toBe('4|2')
  })
})
