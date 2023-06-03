import axios from "axios";

const BASE_URL="https://api.themoviedb.org/3";
const TMDB_TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYTliZDVmMDM4ZDI3MDE1ZTMyOTRhZjQyNGM5NzA1YyIsInN1YiI6IjY0N2I0MWEyY2Y0YjhiMDBjM2QyMmQyNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.pa7rrihinMTebss5GMp1vYNg-SNIzH9AKUu3rx-PTP4"

const headers={
    Authorization:"bearer "+TMDB_TOKEN
}
export const fetchData=async(url,params)=>{
   try{
      const {data}=await axios.get(BASE_URL+url,{headers,params})
      return data;
   }catch(e){
    console.log(e)
    return e;
   }
}