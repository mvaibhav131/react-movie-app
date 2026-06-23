import React from "react";
import ReactPlayer from "react-player/youtube";
import { IoClose } from "react-icons/io5";
import "./style.scss";

const VideoPopup = ({ show, setShow, videoId, setVideoId }) => {
    const hidePopup = () => {
        setShow(false);
        setVideoId(null);
    };
    return (
        <div className={`videoPopup ${show ? "visible" : ""}`}>
            <div className="opacityLayer" onClick={hidePopup} />
            <div className="videoPlayer">
                <button className="closeBtn" onClick={hidePopup}>
                    <IoClose />
                </button>
                <ReactPlayer
                    url={`https://www.youtube.com/watch?v=${videoId}`}
                    controls
                    width="100%"
                    height="100%"
                    playing={show}
                />
            </div>
        </div>
    );
};

export default VideoPopup;