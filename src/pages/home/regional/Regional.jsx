import React, { useState } from 'react';
import ContentWrapper from '../../../components/contentWrapper/ContentWrapper';
import SwitchTab from '../../../components/switchTabs/SwitchTab';
import useFetch from '../../../hooks/useFetch';
import Carousel from '../../../components/carousel/Carousel';

const Regional = () => {
    const [mediaType, setMediaType] = useState("movie");
    const [lang, setLang]           = useState("mr");

    const { data, loading } = useFetch(
        `/discover/${mediaType}?with_original_language=${lang}&sort_by=release_date.desc&include_adult=false&vote_count.gte=3`
    );

    const onTypeChange = (tab) => {
        setMediaType(tab === "Movies" ? "movie" : "tv");
    };
    const onLangChange = (tab) => {
        if (tab === "Marathi")  setLang("mr");
        if (tab === "Bhojpuri") setLang("bh");
        if (tab === "Punjabi")  setLang("pa");
        if (tab === "Bengali")  setLang("bn");
    };

    return (
        <div className="carouselSection">
            <ContentWrapper>
                <span className="carouselTitle">Regional</span>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <SwitchTab data={["Movies", "TV"]}                           onTabChange={onTypeChange} />
                    <SwitchTab data={["Marathi", "Bhojpuri", "Punjabi", "Bengali"]} onTabChange={onLangChange} />
                </div>
            </ContentWrapper>
            <Carousel data={data?.results} loading={loading} endpoint={mediaType} />
        </div>
    );
};

export default Regional;
