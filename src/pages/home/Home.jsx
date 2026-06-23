import React from 'react';
import "./style.scss";
import HeroBanner from './heroBanner/HeroBanner';
import LatestHindi from './latestHindi/LatestHindi';
import Regional from './regional/Regional';
import Devotional from './devotional/Devotional';
import SouthDubbed from './southDubbed/SouthDubbed';
import Trending from './trending/Trending';
import Popular from './popular/Popular';
import TopRated from './topRated/TopRated';
import Upcoming from './upcoming/Upcoming';

const Home = () => {
    return (
        <div className='homePage'>
            <HeroBanner />
            <LatestHindi />
            <Regional />
            <SouthDubbed />
            <Devotional />
            <Trending />
            <Popular />
            <TopRated />
            <Upcoming />
        </div>
    );
};

export default Home;
