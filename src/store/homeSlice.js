import { createSlice } from '@reduxjs/toolkit'

export const homeSlice = createSlice({
  name: 'home',
  initialState: {
    genres: {},
  },
  reducers: {
    getGenres: (state, action) => {
      state.genres = action.payload
    },
  },
})

export const { getGenres } = homeSlice.actions
export default homeSlice.reducer
