import React, { useState } from "react";
import ContentWrapper from "../../../components/contentWrapper/ContentWrapper";
import SwitchTab from "../../../components/switchTabs/SwitchTab";
import useFetch from "../../../hooks/useFetch";
import Carousel from "../../../components/carousel/Carousel";

const Devotional = () => {
    const [lang, setLang] = useState("hi");

    // Genre 14=Fantasy, 36=History — captures mythological/devotional Indian films
    const { data, loading } = useFetch(
        `/discover/movie?with_original_language=${lang}&with_genres=14,36&sort_by=popularity.desc&include_adult=false&vote_count.gte=5`
    );

    const onTabChange = (tab) => {
        if (tab === "Hindi")   setLang("hi");
        if (tab === "Marathi") setLang("mr");
        if (tab === "Tamil")   setLang("ta");
        if (tab === "Telugu")  setLang("te");
    };

    return (
        <div className="carouselSection">
            <ContentWrapper>
                <span className="carouselTitle">Devotional &amp; Spiritual</span>
                <SwitchTab data={["Hindi", "Marathi", "Tamil", "Telugu"]} onTabChange={onTabChange} />
            </ContentWrapper>
            <Carousel data={data?.results} loading={loading} endpoint="movie" />
        </div>
    );
};

export default Devotional;