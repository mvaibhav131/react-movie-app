import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";
import Select from "react-select";
import "./style.scss";
import useFetch from "../../hooks/useFetch";
import ContentWrapper from "../../components/contentWrapper/ContentWrapper";
import Spinner from "../../components/spinner/Spinner";
import MovieCard from "../../components/movieCard/MovieCard";
import { fetchData } from "../../utils/api";

let filters = {};

const sortbyData = [
    { value: "popularity.desc",           label: "Popularity (High to Low)" },
    { value: "popularity.asc",            label: "Popularity (Low to High)" },
    { value: "vote_average.desc",         label: "Rating (High to Low)" },
    { value: "vote_average.asc",          label: "Rating (Low to High)" },
    { value: "primary_release_date.desc", label: "Newest First" },
    { value: "primary_release_date.asc",  label: "Oldest First" },
    { value: "original_title.asc",        label: "Title (A-Z)" },
];

const languageData = [
    { value: "hi", label: "Hindi" },
    { value: "mr", label: "Marathi" },
    { value: "en", label: "English" },
    { value: "ta", label: "Tamil" },
    { value: "te", label: "Telugu" },
    { value: "bn", label: "Bengali" },
    { value: "pa", label: "Punjabi" },
    { value: "kn", label: "Kannada" },
    { value: "ml", label: "Malayalam" },
    { value: "bh", label: "Bhojpuri" },
];

const Explore = () => {
    const [data, setData]       = useState(null);
    const [pageNum, setPageNum] = useState(1);
    const [loading, setLoading] = useState(false);
    const [genre, setGenre]     = useState(null);
    const [sortby, setSortby]   = useState(null);
    const [language, setLanguage] = useState(null);
    const { mediaType } = useParams();

    const { data: genresData } = useFetch(`/genre/${mediaType}/list`);

    const fetchInitialData = () => {
        setLoading(true);
        fetchData(`/discover/${mediaType}`, filters).then((res) => {
            setData(res);
            setPageNum((prev) => prev + 1);
            setLoading(false);
        });
    };

    const fetchNextPageData = () => {
        fetchData(`/discover/${mediaType}?page=${pageNum}`, filters).then((res) => {
            if (data?.results) {
                setData({ ...data, results: [...data.results, ...res.results] });
            } else {
                setData(res);
            }
            setPageNum((prev) => prev + 1);
        });
    };

    useEffect(() => {
        filters = {};
        setData(null);
        setPageNum(1);
        setSortby(null);
        setGenre(null);
        setLanguage(null);
        fetchInitialData();
    }, [mediaType]);

    const onChange = (selectedItems, action) => {
        if (action.name === "sortby") {
            setSortby(selectedItems);
            if (action.action !== "clear") {
                filters.sort_by = selectedItems.value;
            } else {
                delete filters.sort_by;
            }
        }
        if (action.name === "genres") {
            setGenre(selectedItems);
            if (action.action !== "clear") {
                let genreId = selectedItems.map((g) => g.id);
                genreId = JSON.stringify(genreId).slice(1, -1);
                filters.with_genres = genreId;
            } else {
                delete filters.with_genres;
            }
        }
        if (action.name === "language") {
            setLanguage(selectedItems);
            if (action.action !== "clear") {
                filters.with_original_language = selectedItems.value;
            } else {
                delete filters.with_original_language;
            }
        }
        setPageNum(1);
        fetchInitialData();
    };

    return (
        <div className="explorePage">
            <ContentWrapper>
                <div className="pageHeader">
                    <div className="pageTitle">
                        {mediaType === "tv" ? "Explore TV Shows" : "Explore Movies"}
                    </div>
                    <div className="filters">
                        <Select
                            name="language"
                            value={language}
                            options={languageData}
                            onChange={onChange}
                            isClearable
                            placeholder="Language"
                            className="react-select-container langDD"
                            classNamePrefix="react-select"
                        />
                        <Select
                            isMulti
                            name="genres"
                            value={genre}
                            closeMenuOnSelect={false}
                            options={genresData?.genres}
                            getOptionLabel={(o) => o.name}
                            getOptionValue={(o) => o.id}
                            onChange={onChange}
                            placeholder="Genre"
                            className="react-select-container genresDD"
                            classNamePrefix="react-select"
                        />
                        <Select
                            name="sortby"
                            value={sortby}
                            options={sortbyData}
                            onChange={onChange}
                            isClearable
                            placeholder="Sort by"
                            className="react-select-container sortbyDD"
                            classNamePrefix="react-select"
                        />
                    </div>
                </div>

                {loading && <Spinner initial={true} />}
                {!loading && (
                    <>
                        {data?.results?.length > 0 ? (
                            <InfiniteScroll
                                className="content"
                                dataLength={data?.results?.length || []}
                                next={fetchNextPageData}
                                hasMore={pageNum <= data?.total_pages}
                                loader={<Spinner />}
                            >
                                {data?.results?.map((item, index) => {
                                    if (item.media_type === "person") return null;
                                    return (
                                        <MovieCard key={index} data={item} mediaType={mediaType} />
                                    );
                                })}
                            </InfiniteScroll>
                        ) : (
                            <span className="resultNotFound">Sorry, no results found!</span>
                        )}
                    </>
                )}
            </ContentWrapper>
        </div>
    );
};

export default Explore;
