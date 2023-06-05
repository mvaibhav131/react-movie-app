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
        
    },
    extraReducers: {
        
    },
});

export default authSlice.reducer;