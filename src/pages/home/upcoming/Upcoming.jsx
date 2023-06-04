import React, { useState } from "react";
import ContentWrapper from "../../../components/contentWrapper/ContentWrapper";
import SwitchTab from "../../../components/switchTabs/SwitchTab";
import useFetch from "../../../hooks/useFetch";
import Carousel from "../../../components/carousel/Carousel";

const Upcoming = () => {
  const [endpoint, setEndpoint] = useState("movie");

  const { data, loading } = useFetch(`/${endpoint}/upcoming`);

  // const onTabChange = (tab) => {
  //     setEndpoint(tab === "Movies" ? "movie" : "tv")

  // };
  return (
    <div className="carouselSection">
      <ContentWrapper className="contentWrapper">
        <span className="carouselTitle">Upcoming Movie's</span>
              <SwitchTab data={["Movies"]}
                //   onTabChange={onTabChange}
              />
      </ContentWrapper>
      <Carousel data={data?.results} loading={loading} endpoint={endpoint} />
    </div>
  );
};

export default Upcoming;
