import React, { useRef } from "react";
import {
    BsFillArrowLeftCircleFill,
    BsFillArrowRightCircleFill,
} from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import "./style.scss";
import ContentWrapper from "../contentWrapper/ContentWrapper";
import Img from "../lazyLoadImage/Img";
import PosterFallback from "../../assets/no-poster.jpg";
import CircleRating from "../circleRating/CircleRating";
import Genres from "../genres/Genres";

const Carousel = ({ data, loading, endpoint, title }) => {
    const carouselContainer = useRef(); // is used for to get reference of any tag
    const navigate = useNavigate();
    const { url } = useSelector((state) => state.home);

    const navigation = (dir) => {
        const container = carouselContainer.current
        const scrollAmount = dir === "left" ? container.scrollLeft - (container.offsetWidth + 15) : container.scrollLeft + (container.offsetWidth + 15);
        container.scrollTo({
            left: scrollAmount,
            behavior: "smooth"
        })
    }
     const skItem = () => {
        return (
            <div className="skeletonItem">
                <div className="posterBlockskeleton"></div>
                <div className="textBlock">
                    <div className="titleskeleton"></div>
                    <div className="dateskeleton"></div>
                </div>
            </div>
        )
    }
    return (
        <div className="carousel">
            <ContentWrapper>
                {title && <div className="carouselTitle"></div>}
                <BsFillArrowLeftCircleFill className="carouselLeftNav arrow" onClick={() => navigation("left")} />
                <BsFillArrowRightCircleFill className="carouselRightNav arrow" onClick={() => navigation("right")} />
                {!loading ? (
                    <div className="carouselItems" ref={carouselContainer}>
                        {data?.map((item) => {
                            const posterUrl = item.poster_path ? url.poster + item.poster_path : PosterFallback
                            return (
                                <div key={item.id} className="carouselItem" onClick={() => navigate(`/${item.media_type || endpoint}/${item.id}}`)}>
                                    <div className="posterBlock">
                                        <Img src={posterUrl} />
                                        <CircleRating rating={item.vote_average.toFixed(1)} />
                                        <Genres data={item.genre_ids.slice(0, 3)} />
                                    </div>
                                    <div className="textBlock">
                                        <span className="title">
                                            {item.title || item.name}
                                        </span>
                                        <span className="date">
                                            {dayjs(item.release_Date).format("MMM DD, YYYY")}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="loadingSkeleton">
                        {skItem()}
                        {skItem()}
                        {skItem()}
                        {skItem()}
                        {skItem()}
                    </div>
                )}
            </ContentWrapper>
        </div>
    )
};
export default Carousel;
