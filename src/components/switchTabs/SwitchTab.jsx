import React, { useState, useRef, useEffect } from 'react';
import "./style.scss";

const SwitchTab = ({ data, onTabChange }) => {
    const [selectedTab, setSelectedTab] = useState(0);
    const [bgStyle, setBgStyle] = useState({ left: 0, width: 0 });
    const tabRefs = useRef([]);

    // Measure tab position and width on selection change
    useEffect(() => {
        const el = tabRefs.current[selectedTab];
        if (el) {
            setBgStyle({ left: el.offsetLeft, width: el.offsetWidth });
        }
    }, [selectedTab]);

    // Measure on mount (after first render)
    useEffect(() => {
        const el = tabRefs.current[0];
        if (el) setBgStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }, []);

    const activeTab = (tab, index) => {
        setSelectedTab(index);
        onTabChange(tab, index);
    };

    return (
        <div className='switchingTabs'>
            <div className="tabItems">
                {data.map((tab, index) => (
                    <span
                        key={index}
                        ref={el => tabRefs.current[index] = el}
                        className={`tabItem ${selectedTab === index ? "active" : ""}`}
                        onClick={() => activeTab(tab, index)}
                    >
                        {tab}
                    </span>
                ))}
                <span className="movingBg" style={{ left: bgStyle.left, width: bgStyle.width }} />
            </div>
        </div>
    );
};

export default SwitchTab;

