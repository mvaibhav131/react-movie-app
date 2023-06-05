import { configureStore } from "@reduxjs/toolkit";
import homeSlice from "./homeSlice";
import authSlice from "./authSlice";


export const store= configureStore({
    reducer:{
        home: homeSlice, 
        user:authSlice,
    },
})