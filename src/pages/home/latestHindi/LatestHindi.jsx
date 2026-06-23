import React, { useState } from 'react';
import ContentWrapper from '../../../components/contentWrapper/ContentWrapper';
import SwitchTab from '../../../components/switchTabs/SwitchTab';
import useFetch from '../../../hooks/useFetch';
import Carousel from '../../../components/carousel/Carousel';

const LatestHindi = () => {
    const [mediaType, setMediaType] = useState("movie");
    const [sort, setSort]           = useState("release_date.desc");

    const { data, loading } = useFetch(
        `/discover/${mediaType}?with_original_language=hi&sort_by=${sort}&include_adult=false&vote_count.gte=5`
    );

    const onTypeChange = (tab) => {
        setMediaType(tab === "Movies" ? "movie" : "tv");
    };
    const onSortChange = (tab) => {
        if (tab === "Latest")  setSort("release_date.desc");
        if (tab === "Popular") setSort("popularity.desc");
        if (tab === "Rated")   setSort("vote_average.desc");
    };

    return (
        <div className="carouselSection">
            <ContentWrapper>
                <span className="carouselTitle">Hindi</span>
                <div style={{ display: "flex", gap: "8px" }}>
                    <SwitchTab data={["Movies", "TV"]}  onTabChange={onTypeChange} />
                    <SwitchTab data={["Latest", "Popular", "Rated"]} onTabChange={onSortChange} />
                </div>
            </ContentWrapper>
            <Carousel data={data?.results} loading={loading} endpoint={mediaType} />
        </div>
    );
};

export default LatestHindi;
