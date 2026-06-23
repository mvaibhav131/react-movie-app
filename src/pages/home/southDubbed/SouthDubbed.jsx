import React, { useState } from "react";
import ContentWrapper from "../../../components/contentWrapper/ContentWrapper";
import SwitchTab from "../../../components/switchTabs/SwitchTab";
import useFetch from "../../../hooks/useFetch";
import Carousel from "../../../components/carousel/Carousel";

const SouthDubbed = () => {
    const [lang, setLang] = useState("te");

    // Popular South Indian movies — most popular ones have Hindi dubbed versions
    const { data, loading } = useFetch(
        `/discover/movie?with_original_language=${lang}&sort_by=popularity.desc&include_adult=false&vote_count.gte=50`
    );

    const onTabChange = (tab) => {
        if (tab === "Telugu") setLang("te");
        if (tab === "Tamil")  setLang("ta");
        if (tab === "Kannada") setLang("kn");
        if (tab === "Malayalam") setLang("ml");
    };

    return (
        <div className="carouselSection">
            <ContentWrapper>
                <span className="carouselTitle">South (Hindi Dubbed)</span>
                <SwitchTab data={["Telugu", "Tamil", "Kannada", "Malayalam"]} onTabChange={onTabChange} />
            </ContentWrapper>
            <Carousel data={data?.results} loading={loading} endpoint="movie" />
        </div>
    );
};

export default SouthDubbed;
