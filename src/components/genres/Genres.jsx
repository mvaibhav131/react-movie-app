import React from 'react'
import { useSelector } from 'react-redux';
import "./style.scss";

const Genres = ({ data }) => {
    const { genres } = useSelector((state) => state.home);
  return (
      <div className="genres">
          {data?.map((i) => {
              if (!genres[i]?.name) return;
              return (
                  <div key={i} className="genre">
                      {genres[i]?.name}
                  </div>
              )
          })}
    </div>
  )
}

export default Genres
