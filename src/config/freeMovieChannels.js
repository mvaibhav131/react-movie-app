/**
 * Official YouTube channels of studios and distributors that publish complete films for free.
 * scripts/buildFreeMovies.mjs lists their uploads and keeps only embeddable, full-length films that match a TMDB movie.
 * Add a channel only when it is run by the rights holder; uploads from fan or re-upload channels are not licensed.
 * Earlier entries win when the same film is on several channels.
 * Left out because they yielded no playable films when checked: YRF, Tips Official, Rajshri Marathi, Everest Marathi.
 */
export const FREE_MOVIE_CHANNELS = [
  { id: 'UC3ar28GS6o1p0m_wabfk2zw', name: 'Pen Movies' },
  { id: 'UCEKWXRsfUHkan-D_ljU8Asw', name: 'Rajshri' },
  { id: 'UCBOmfqgTZi7yDp4-3Lr_3lA', name: 'Shemaroo Movies' },
  { id: 'UCYauDsl-rswjQGpA0_-Z9Pw', name: 'Ultra Movie Parlour' },
  { id: 'UCLsRC6cjQ__FA9OYiF49czQ', name: 'Eagle Bollywood Movies' },
  { id: 'UCYg12aaGvB-GqFJRsVCSHBQ', name: 'Eagle Multiplex' },
  { id: 'UCCC0Tgo76GRhn96VpeEkf2A', name: 'Eagle Classic Movies' },
  { id: 'UCXSi7KDGFmsD5iL_Di_hB0A', name: 'Eagle Action Movies' },
  { id: 'UCBETHYM36RTO6CaMZFw4OWg', name: 'Shemaroo MarathiBana' },
  { id: 'UC6fEAf3vBs1W0gCEFNrDOIg', name: 'EverestTalkies' },
  { id: 'UCBAhH8ma7VWNPWoiAOdrgUQ', name: 'Zee Talkies' },
  { id: 'UCOF23vGxkbhN4wl7ROrgXsA', name: 'Goldmines Bollywood' },
  { id: 'UCs570zdFq_NNA5OcV8chnHw', name: 'Goldmines Movies' },
  { id: 'UCvUctuMp58UD_kQtcWcNCjw', name: 'Goldmines Premiere' },
  { id: 'UC_cirOvovTcibMbIU5HDkLQ', name: 'Goldmines Action Heroes' },
  { id: 'UCyoXW-Dse7fURq30EWl_CUA', name: 'Goldmines' },
  { id: 'UCX_uPA_dGf7wXjuMEaSKLJA', name: 'Aditya Movies' },
  { id: 'UCrOfzpH1sWPu1IqHnVhojKA', name: 'Sri Balaji Hindi Movies' },
]
