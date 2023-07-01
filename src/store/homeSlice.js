import { createSlice } from "@reduxjs/toolkit";

export const homeSlice = createSlice({
    name: "home",
    initialState: {
        url: {},
        genres: {}
    },
    //slice me hum global state me data save rakhte hai url ka data and genres ka data.
    reducers: {
        getApiConfiguration: (state, action) => {
            state.url = action.payload;
        },//for url
        getGenres: (state, action) => {
            state.genres = action.payload
        }//for genres
    },
});

export const {getApiConfiguration,getGenres}=homeSlice.actions;
export default homeSlice.reducer;