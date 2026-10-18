import { describe, expect, it } from 'vitest'
import { isoDurationSeconds, matchTitle, parseVideoTitle, pickMovie, runtimeFits, yearFits } from './match'

describe('isoDurationSeconds', () => {
  it('reads hours, minutes and seconds', () => {
    expect(isoDurationSeconds('PT2H15M30S')).toBe(8130)
    expect(isoDurationSeconds('PT45M')).toBe(2700)
    expect(isoDurationSeconds('PT1H')).toBe(3600)
  })
  it('returns 0 for live streams and junk', () => {
    expect(isoDurationSeconds('P0D')).toBe(0)
    expect(isoDurationSeconds('')).toBe(0)
    expect(isoDurationSeconds('nonsense')).toBe(0)
  })
})

describe('parseVideoTitle', () => {
  it('takes the film name from common upload formats', () => {
    expect(parseVideoTitle('Pushpa Full Movie Hindi Dubbed | Allu Arjun | Sukumar').names[0]).toBe('Pushpa')
    expect(parseVideoTitle('Dilwale Dulhania Le Jayenge | Full Movie | Shah Rukh Khan, Kajol').names[0]).toBe('Dilwale Dulhania Le Jayenge')
    expect(parseVideoTitle('Bhool Bhulaiyaa (HD) - Hindi Full Movie - Akshay Kumar').names[0]).toBe('Bhool Bhulaiyaa')
    expect(parseVideoTitle('RRR Hindi Full Movie').names[0]).toBe('RRR')
  })

  it('keeps film names that contain a language word', () => {
    expect(parseVideoTitle('Hindi Medium Full Movie | Irrfan Khan').names[0]).toBe('Hindi Medium')
  })

  it('skips segments that are only labels', () => {
    const { names } = parseVideoTitle('New Marathi Movie | Full Movie | Ventilator')
    expect(names[0]).toBe('Ventilator')
  })

  it('handles uploads that say "Full Hindi Movie" or add genre labels', () => {
    expect(parseVideoTitle('Controll (2025) | Full Hindi Movie | Stylish Action Thriller | Anoop Singh').names[0]).toBe('Controll')
    expect(parseVideoTitle('Itni Si Baat (1981) Bollywood Full Movie | Sanjeev Kumar').names[0]).toBe('Itni Si Baat')
    expect(parseVideoTitle('Kaddu Mucchi | Hindi Dubbed Movie 2024 | Megha Sri').names[0]).toBe('Kaddu Mucchi')
    expect(parseVideoTitle('Haqeeqat (1964) Full Hindi War Drama Movie | Dharmendra').year).toBe(1964)
  })

  it('treats a trailing year as a hint and keeps a bracketed original title', () => {
    expect(parseVideoTitle('Chatrapathi Hindi Movie 2024 | Bellamkonda Sai Sreenivas')).toMatchObject({ names: ['Chatrapathi', 'Bellamkonda Sai Sreenivas'], year: 2024 })
    expect(parseVideoTitle('Khakhi Aur Khiladi (Kaththi) 4K Full Hindi Dubbed Movie | Vijay').names).toEqual(['Khakhi Aur Khiladi', 'Vijay', 'Kaththi'])
    expect(parseVideoTitle('1920 Full Movie').names[0]).toBe('1920')
  })

  it('reads the year and the Hindi-dubbed flag', () => {
    expect(parseVideoTitle('Baahubali (2015) Hindi Dubbed Full Movie')).toMatchObject({ year: 2015, dubbedHindi: true })
    expect(parseVideoTitle('Sholay Full Movie').dubbedHindi).toBe(false)
  })
})

describe('matchTitle', () => {
  it('matches exact names ignoring case, punctuation and articles', () => {
    expect(matchTitle('the dark knight', { title: 'The Dark Knight' })).toBe('exact')
    expect(matchTitle('Bhool Bhulaiyaa', { title: 'Bhool Bhulaiyaa', original_title: 'भूल भुलैया' })).toBe('exact')
  })
  it('allows a subtitle on one side only for longer names', () => {
    expect(matchTitle('Pushpa', { title: 'Pushpa: The Rise - Part 1' })).toBe('prefix')
    expect(matchTitle('Don', { title: 'Don 2' })).toBe(null)
    expect(matchTitle('Dhoom', { title: 'Dhoom 2' })).toBe('prefix')
  })
  it('rejects unrelated titles', () => {
    expect(matchTitle('Sholay', { title: 'Shola Aur Shabnam' })).toBe(null)
  })
})

describe('fit checks', () => {
  it('accepts runtimes within the tolerance only', () => {
    expect(runtimeFits(150, 142)).toBe(true)
    expect(runtimeFits(150, 100)).toBe(false)
    expect(runtimeFits(0, 120)).toBe(false)
    expect(runtimeFits(150, 125, 12)).toBe(false)
  })
  it('allows one year of slack and unknown years', () => {
    expect(yearFits(2015, '2015-07-10')).toBe(true)
    expect(yearFits(2015, '2016-01-01')).toBe(true)
    expect(yearFits(2015, '2019-01-01')).toBe(false)
    expect(yearFits(null, '2019-01-01')).toBe(true)
  })
})

describe('pickMovie', () => {
  const movies = [
    { id: 1, title: 'Dhoom', release_date: '2004-08-27', runtime: 129, popularity: 20, vote_count: 900 },
    { id: 2, title: 'Dhoom 2', release_date: '2006-11-24', runtime: 152, popularity: 30, vote_count: 1200 },
  ]
  it('uses the runtime to tell apart films with similar names', () => {
    expect(pickMovie('Dhoom', null, movies, 128)?.id).toBe(1)
    expect(pickMovie('Dhoom 2', null, movies, 150)?.id).toBe(2)
  })
  it('refuses a film whose length does not agree', () => {
    expect(pickMovie('Dhoom', null, movies, 60)).toBe(null)
  })
  it('prefers an exact name over a prefix name', () => {
    const list = [
      { id: 3, title: 'Pushpa: The Rise - Part 1', release_date: '2021-12-17', runtime: 179, popularity: 90 },
      { id: 4, title: 'Pushpa', release_date: '2021-12-17', runtime: 175, popularity: 1 },
    ]
    expect(pickMovie('Pushpa', 2021, list, 177)?.id).toBe(4)
  })

  it('refuses to guess between same-named films that cannot be told apart', () => {
    const remakes = [
      { id: 5, title: 'Don', release_date: '1978-05-12', runtime: 175, popularity: 10, vote_count: 300 },
      { id: 6, title: 'Don', release_date: '2006-10-20', runtime: 178, popularity: 20, vote_count: 900 },
    ]
    expect(pickMovie('Don', null, remakes, 176)).toBe(null)
    expect(pickMovie('Don', 1978, remakes, 176)?.id).toBe(5)
  })

  it('needs a year or a well-known entry before accepting a one-word name', () => {
    const obscure = [{ id: 7, title: 'Video', release_date: '2026-09-11', runtime: 124, popularity: 1, vote_count: 1 }]
    expect(pickMovie('Video', null, obscure, 120)).toBe(null)
    expect(pickMovie('Video', 2026, obscure, 120)?.id).toBe(7)
    expect(pickMovie('Dhoom', null, movies, 128)?.id).toBe(1)
  })
})
