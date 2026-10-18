import { describe, expect, it } from 'vitest'
import { countByStatus, normalizeCricApiMatch, normalizeSportsDbEvent, sortMatches } from './cricketService'
import { platformsFor } from '../../config/cricket'

const NOW = Date.parse('2026-10-18T06:00:00Z')

const event = (overrides = {}) => ({
  idEvent: '1',
  strEvent: 'South Africa Cricket vs Australia Cricket',
  strLeague: 'ICC World Test Championship',
  strHomeTeam: 'South Africa Cricket',
  strAwayTeam: 'Australia Cricket',
  strHomeTeamBadge: 'https://r2.example/sa.png',
  intHomeScore: null,
  intAwayScore: null,
  dateEvent: '2026-10-18',
  strTime: '09:30:00',
  strTimestamp: '2026-10-18T09:30:00',
  strVenue: "St George's Park",
  strStatus: null,
  strPostponed: 'no',
  ...overrides,
})

describe('normalizeSportsDbEvent', () => {
  it('marks future fixtures as upcoming and parses the UTC start time', () => {
    const m = normalizeSportsDbEvent(event(), NOW)
    expect(m.status).toBe('upcoming')
    expect(m.startTime).toBe('2026-10-18T09:30:00.000Z')
    expect(m.timeKnown).toBe(true)
    expect(m.teams.map((t) => t.name)).toEqual(['South Africa Cricket', 'Australia Cricket'])
  })

  it('does not invent a live status: a started match without a status is "unknown"', () => {
    const m = normalizeSportsDbEvent(event({ strTimestamp: '2026-10-18T04:00:00' }), NOW)
    expect(m.status).toBe('unknown')
  })

  it('recognises live, finished and postponed states', () => {
    expect(normalizeSportsDbEvent(event({ strStatus: 'Live', strTimestamp: '2026-10-18T04:00:00' }), NOW).status).toBe('live')
    expect(normalizeSportsDbEvent(event({ strStatus: 'FT', intHomeScore: 156, intAwayScore: 161, strTimestamp: '2026-10-17T04:00:00' }), NOW).status).toBe('completed')
    expect(normalizeSportsDbEvent(event({ strStatus: 'Postponed' }), NOW).status).toBe('postponed')
    expect(normalizeSportsDbEvent(event({ strPostponed: 'yes' }), NOW).status).toBe('postponed')
  })

  it('treats a 00:00:00 time as "time not known" and keeps today\'s fixture upcoming', () => {
    const m = normalizeSportsDbEvent(event({ strTime: '00:00:00', strTimestamp: '2026-10-18T00:00:00', dateEvent: '2026-10-18' }), NOW)
    expect(m.timeKnown).toBe(false)
    expect(m.status).toBe('upcoming')
    expect(normalizeSportsDbEvent(event({ strTime: '00:00:00', strTimestamp: '2026-10-20T00:00:00', dateEvent: '2026-10-20' }), NOW).status).toBe('upcoming')
  })

  it('considers old events without a result as completed', () => {
    expect(normalizeSportsDbEvent(event({ strTimestamp: '2026-09-01T09:30:00' }), NOW).status).toBe('completed')
  })
})

describe('normalizeCricApiMatch', () => {
  const base = {
    id: 'abc',
    name: 'India vs Australia, 1st Test',
    matchType: 'test',
    status: 'Day 2: India lead by 45 runs',
    venue: 'Wankhede Stadium',
    dateTimeGMT: '2026-10-18T04:00:00',
    teams: ['India', 'Australia'],
    teamInfo: [
      { name: 'India', shortname: 'IND', img: 'https://img.example/ind.png' },
      { name: 'Australia', shortname: 'AUS', img: 'https://img.example/aus.png' },
    ],
    score: [
      { r: 312, w: 10, o: 98.2, inning: 'India Inning 1' },
      { r: 245, w: 6, o: 80, inning: 'Australia Inning 1' },
      { r: 101, w: 2, o: 30, inning: 'India Inning 2' },
    ],
    matchStarted: true,
    matchEnded: false,
  }

  it('flags a started, unfinished match as live and joins innings per team', () => {
    const m = normalizeCricApiMatch(base)
    expect(m.status).toBe('live')
    expect(m.league).toBe('TEST')
    expect(m.teams[0]).toMatchObject({ name: 'India', short: 'IND', score: '312/10 (98.2 ov) & 101/2 (30 ov)' })
    expect(m.teams[1].score).toBe('245/6 (80 ov)')
  })

  it('maps finished and scheduled matches', () => {
    expect(normalizeCricApiMatch({ ...base, matchEnded: true }).status).toBe('completed')
    expect(normalizeCricApiMatch({ ...base, matchStarted: false, matchEnded: false, score: [] }).status).toBe('upcoming')
  })
})

describe('ordering and counts', () => {
  const m = (id, status, startTime) => ({ id, status, startTime, teams: [], league: 'x', name: id })

  it('puts live first, soonest upcoming next, newest results last', () => {
    const sorted = sortMatches([
      m('done-old', 'completed', '2026-10-10T00:00:00Z'),
      m('later', 'upcoming', '2026-10-25T00:00:00Z'),
      m('soon', 'upcoming', '2026-10-19T00:00:00Z'),
      m('live', 'live', '2026-10-18T00:00:00Z'),
      m('done-new', 'completed', '2026-10-17T00:00:00Z'),
    ])
    expect(sorted.map((x) => x.id)).toEqual(['live', 'soon', 'later', 'done-new', 'done-old'])
  })

  it('counts matches per status', () => {
    expect(countByStatus([m('a', 'live'), m('b', 'upcoming'), m('c', 'upcoming')])).toMatchObject({ live: 1, upcoming: 2, completed: 0 })
  })
})

describe('official broadcaster suggestions', () => {
  it('maps tournaments to official platforms and always returns real https links', () => {
    const wtc = platformsFor({ league: 'ICC World Test Championship', name: 'South Africa vs Australia' })
    expect(wtc.map((p) => p.id)).toContain('jiohotstar')
    const ipl = platformsFor({ league: 'Indian Premier League', name: 'GT vs RCB' })
    expect(ipl.map((p) => p.id)).toEqual(['jiohotstar', 'willow'])
    const unknown = platformsFor({ league: 'Some Club Cup', name: 'A vs B' })
    expect(unknown.length).toBeGreaterThan(0)
    ;[...wtc, ...ipl, ...unknown].forEach((p) => expect(p.url.startsWith('https://')).toBe(true))
  })
})
