import { createSlice } from "@reduxjs/toolkit";


 const authSlice = createSlice({
    name: "user",
    initialState: {
        msg: "",
        user: "",
        token: "",
        loading: false,
        error: ""
    },
    reducers: {
        //user data
    },
    extraReducers: {
        // user extraReducer
    },
});

export default authSlice.reducer;