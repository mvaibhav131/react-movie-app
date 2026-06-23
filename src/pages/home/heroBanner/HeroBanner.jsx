import React, { useEffect, useState } from 'react';
import "./style.scss";
import { useNavigate } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import { useSelector } from 'react-redux';
import ContentWrapper from '../../../components/contentWrapper/ContentWrapper';
import Img from '../../../components/lazyLoadImage/Img';
import { HiOutlineSearch } from 'react-icons/hi';

const HeroBanner = () => {
    const [background, setBackground] = useState("");
    const [query, setQuery] = useState("");
    const navigate = useNavigate();
    const { url } = useSelector((state) => state.home);
    const { data, loading } = useFetch("/movie/upcoming");

    useEffect(() => {
        if (data?.results?.length && url.backdrop) {
            const randomMovie = data.results[Math.floor(Math.random() * 10)];
            if (randomMovie?.backdrop_path) {
                setBackground(url.backdrop + randomMovie.backdrop_path);
            }
        }
    }, [data, url]);

    const searchQueryHandler = (event) => {
        if (event.key === "Enter" && query.length > 0) {
            navigate(`/search/${query}`);
        }
    };

    const handleSearch = () => {
        if (query.length > 0) navigate(`/search/${query}`);
    };

    return (
        <div className="heroBanner">
            {loading ? (
                <div className="heroBannerSkeleton skeleton" />
            ) : (
                <div className="backdrop-img">
                    <Img src={background} />
                </div>
            )}
            <div className="opacity-layer" />
            <ContentWrapper>
                <div className="heroBannerContent">
                    <span className="title">Discover<br />Your Next Favourite</span>
                    <span className="subTitle">Millions of movies & TV shows — explore now</span>
                    <div className="searchInput">
                        <HiOutlineSearch className="searchIcon" />
                        <input
                            type="text"
                            placeholder="Search movie or TV show..."
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyUp={searchQueryHandler}
                        />
                        <button onClick={handleSearch}>Search</button>
                    </div>
                </div>
            </ContentWrapper>
        </div>
    );
};

export default HeroBanner;

