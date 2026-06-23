import React, { useEffect, useState, useRef } from "react";
import { IoClose, IoRefresh } from "react-icons/io5";
import { FiMapPin, FiClock, FiTv } from "react-icons/fi";
import "./style.scss";

// CORS proxy strips X-Frame-Options so iframe loads inside modal
const proxy = (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`;

const SERVERS = [
    { name: "CricFree",    direct: "https://cricfree.sc/",                          proxied: true  },
    { name: "SmartCric",   direct: "https://smartcric.com/channel/live",             proxied: true  },
    { name: "Star Sp. 1",  direct: "https://daddylive.me/stream/stream-94.php",      proxied: true  },
    { name: "Star Sp. 2",  direct: "https://daddylive.me/stream/stream-95.php",      proxied: true  },
    { name: "Sony Sports", direct: "https://daddylive.me/stream/stream-100.php",     proxied: true  },
    { name: "DD Sports",   direct: "https://daddylive.me/stream/stream-104.php",     proxied: true  },
    { name: "CricTime",    direct: "https://crictime.com/cricket_new.php?chanel=star1", proxied: false },
    { name: "StrikeOut",   direct: "https://www.strikeout.nu/?sport=cricket",        proxied: true  },
];

const isLive = (s) => {
    if (!s) return false;
    const l = s.toLowerCase();
    return l.includes("progress") || l.includes("live") || l.includes("innings") || l.includes("lunch") || l.includes("tea");
};
const fmtTime = (d, t) => {
    if (!d) return "";
    try {
        const dt = new Date(`${d}T${t || "00:00:00"}Z`);
        return dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST";
    } catch { return t || ""; }
};

const LiveModal = ({ show, setShow }) => {
    const [matches, setMatches]  = useState([]);
    const [loading, setLoading]  = useState(true);
    const [tab, setTab]          = useState("matches");
    const [sIdx, setSIdx]        = useState(0);
    const [iKey, setIKey]        = useState(0);
    const [started, setStarted]  = useState(false);
    const [iLoading, setILoad]   = useState(true);
    const [iBlocked, setIBlk]    = useState(false);
    const blockTimer             = useRef(null);
    const refreshRef             = useRef(null);

    const fetchMatches = () => {
        setLoading(true);
        const today     = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        Promise.allSettled([
            fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${today}&s=Cricket`).then(r => r.json()),
            fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${yesterday}&s=Cricket`).then(r => r.json()),
        ]).then(results => {
            const all = [];
            results.forEach(r => { if (r.status === "fulfilled" && r.value?.events) all.push(...r.value.events); });
            all.sort((a, b) => {
                const aL = isLive(a.strStatus) ? 2 : a.strStatus === "NS" ? 1 : 0;
                const bL = isLive(b.strStatus) ? 2 : b.strStatus === "NS" ? 1 : 0;
                return bL - aL;
            });
            setMatches(all);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => {
        if (!show) { document.body.style.overflow = ""; clearInterval(refreshRef.current); return; }
        document.body.style.overflow = "hidden";
        setTab("matches");
        setStarted(false);
        fetchMatches();
        refreshRef.current = setInterval(fetchMatches, 60000);
        return () => { document.body.style.overflow = ""; clearInterval(refreshRef.current); };
    }, [show]);

    if (!show) return null;

    const switchServer = (idx) => {
        setSIdx(idx);
        setIKey(k => k + 1);
        setStarted(false);
        setILoad(true);
        setIBlk(false);
        clearTimeout(blockTimer.current);
    };

    const startStream = () => {
        setStarted(true);
        setILoad(true);
        setIBlk(false);
        clearTimeout(blockTimer.current);
        // If no load event in 10s, mark as blocked
        blockTimer.current = setTimeout(() => setIBlk(true), 10000);
    };

    const srv = SERVERS[sIdx];
    const embedUrl = srv.proxied ? proxy(srv.direct) : srv.direct;

    return (
        <div className="liveModal">
            <div className="liveOverlay" onClick={() => setShow(false)} />
            <div className="liveContent">

                <div className="liveHeader">
                    <div className="liveTitle"><span className="liveDot" />LIVE Cricket</div>
                    <div className="liveHeaderR">
                        <button className={`lTab${tab === "matches" ? " on" : ""}`} onClick={() => setTab("matches")}>Live Scores</button>
                        <button className={`lTab${tab === "stream"  ? " on" : ""}`} onClick={() => setTab("stream")}><FiTv /> Watch</button>
                        <button className="lX" onClick={() => setShow(false)}><IoClose /></button>
                    </div>
                </div>

                {/* ── Live Scores ─────────────────── */}
                {tab === "matches" && (
                    <div className="matchesBody">
                        <div className="matchesTop">
                            <span className="matchCount">{matches.length} matches · 60s refresh</span>
                            <button className="refreshBtn" onClick={fetchMatches}><IoRefresh /></button>
                        </div>
                        {loading ? (
                            <div className="mLoader"><div className="mSpin" /><p>Loading...</p></div>
                        ) : matches.length === 0 ? (
                            <div className="noMatches"><p>No matches today</p><span>Switch to Watch tab</span></div>
                        ) : (
                            <div className="matchList">
                                {matches.map((m) => {
                                    const live = isLive(m.strStatus);
                                    const ns   = m.strStatus === "NS";
                                    return (
                                        <div key={m.idEvent} className="matchCard" onClick={() => setTab("stream")}>
                                            <div className="matchTop">
                                                <span className={`mStatus ${live ? "live" : ns ? "upcoming" : "done"}`}>
                                                    {live && <span className="blinkDot" />}
                                                    {live ? "LIVE" : ns ? "UPCOMING" : (m.strStatus || "RESULT")}
                                                </span>
                                                <span className="mLeague">{m.strLeague}</span>
                                            </div>
                                            <div className="matchTeams">
                                                <div className="mTeam">
                                                    {m.strHomeTeamBadge && <img src={m.strHomeTeamBadge} alt="" onError={e => e.target.style.display="none"} />}
                                                    <div className="mTeamInfo">
                                                        <span className="mTeamName">{m.strHomeTeam}</span>
                                                        {m.strHomeScore && <span className="mScore">{m.strHomeScore}</span>}
                                                    </div>
                                                </div>
                                                <div className="mVs">{live ? "▶" : "vs"}</div>
                                                <div className="mTeam away">
                                                    <div className="mTeamInfo">
                                                        <span className="mTeamName">{m.strAwayTeam}</span>
                                                        {m.strAwayScore && <span className="mScore">{m.strAwayScore}</span>}
                                                    </div>
                                                    {m.strAwayTeamBadge && <img src={m.strAwayTeamBadge} alt="" onError={e => e.target.style.display="none"} />}
                                                </div>
                                            </div>
                                            {(m.strVenue || m.strTime) && (
                                                <div className="mMeta">
                                                    {m.strVenue && <span><FiMapPin />{m.strVenue}</span>}
                                                    <span><FiClock />{ns ? fmtTime(m.dateEvent, m.strTime) : (m.strStatus||"")}</span>
                                                </div>
                                            )}
                                            <div className="watchMatchBtn">▶ Watch Live</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <p className="dataNote">TheSportsDB · Click any match to go to Watch tab</p>
                    </div>
                )}

                {/* ── Watch/Stream Tab ────────────── */}
                {tab === "stream" && (
                    <div className="streamSection">
                        {/* Server switcher */}
                        <div className="serverBar">
                            {SERVERS.map((s, i) => (
                                <button key={i} className={`sBtn${i === sIdx ? " on" : ""}`}
                                    onClick={() => switchServer(i)}>
                                    {s.name}
                                </button>
                            ))}
                            <button className="rBtn" onClick={() => switchServer(sIdx)} title="Reload"><IoRefresh /></button>
                        </div>

                        {/* Player */}
                        <div className="playerArea">
                            {!started ? (
                                /* Pre-play */
                                <div className="preScreen">
                                    <button className="bigPlay" onClick={startStream}>▶</button>
                                    <p>{srv.name}</p>
                                    <span>Via CORS proxy · no redirect · plays inside modal</span>
                                    <span className="preHint">If black screen → try next server</span>
                                </div>
                            ) : (
                                <>
                                    {iLoading && !iBlocked && (
                                        <div className="streamLoader">
                                            <div className="mSpin" /><p>Loading {srv.name}...</p>
                                        </div>
                                    )}
                                    {iBlocked && (
                                        <div className="blockedScreen">
                                            <span>⚠️</span>
                                            <p>Server blocked</p>
                                            <span>Try next server →</span>
                                            {sIdx < SERVERS.length - 1 && (
                                                <button className="nextSrvBtn"
                                                    onClick={() => switchServer(sIdx + 1)}>
                                                    Try {SERVERS[sIdx + 1].name}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <iframe
                                        key={iKey}
                                        src={embedUrl}
                                        allowFullScreen
                                        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                                        title="Cricket Live"
                                        className={iBlocked ? "hidden" : ""}
                                        onLoad={() => {
                                            setILoad(false);
                                            clearTimeout(blockTimer.current);
                                            setIBlk(false);
                                        }}
                                    />
                                </>
                            )}
                        </div>
                        <p className="streamNote">
                            Streams via CORS proxy to bypass restrictions · CricFree & SmartCric work best during live matches
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default LiveModal;