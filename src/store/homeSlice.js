import { createSlice } from "@reduxjs/toolkit";

export const homeSlice=createSlice({
    name:"home",
    initialState:{
        url:{},
        generes:{}
    },
    reducers:{
        getApiConfiguration:(state,action)=>{
            state.url=action.payload;
        },
        getGeneres:(state,action)=>{
            state.generes=action.payload
        }
    },
})

export const {getApiConfiguration,getGeneres}=homeSlice.actions;
export default homeSlice.reducer;