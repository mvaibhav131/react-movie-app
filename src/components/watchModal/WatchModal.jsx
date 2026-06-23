import React, { useEffect, useState, useRef } from "react";
import ReactPlayer from "react-player/file";
import { IoClose, IoPlay, IoPause, IoVolumeHigh, IoVolumeMedium,
         IoVolumeLow, IoVolumeOff, IoExpand, IoContract } from "react-icons/io5";
import { FiSkipBack, FiSkipForward, FiExternalLink, FiTv, FiServer, FiRefreshCw } from "react-icons/fi";
import { fetchData } from "../../utils/api";
import "./style.scss";

const SERVERS = {
    movie: [
        { name: "VidLink",  url: (id) => `https://vidlink.pro/movie/${id}?autoplay=true&title=false&poster=false` },
        { name: "VidSrc",   url: (id) => `https://vidsrc.me/embed/movie?tmdb=${id}&autoplay=true` },
        { name: "VidSrc2",  url: (id) => `https://vidsrc.xyz/embed/movie?tmdb=${id}&autoplay=1` },
        { name: "2Embed",   url: (id) => `https://www.2embed.cc/embed/${id}?autoplay=true` },
        { name: "EmbedSu",  url: (id) => `https://embed.su/embed/movie/${id}?autoplay=1` },
        { name: "AutoEmb",  url: (id) => `https://autoembed.cc/movie/tmdb/${id}?autoplay=true` },
    ],
    tv: [
        { name: "VidLink",  url: (id) => `https://vidlink.pro/tv/${id}?autoplay=true&title=false&poster=false` },
        { name: "VidSrc",   url: (id) => `https://vidsrc.me/embed/tv?tmdb=${id}&autoplay=true` },
        { name: "VidSrc2",  url: (id) => `https://vidsrc.xyz/embed/tv?tmdb=${id}&autoplay=1` },
        { name: "2Embed",   url: (id) => `https://www.2embed.cc/embedtv/${id}?autoplay=true` },
        { name: "EmbedSu",  url: (id) => `https://embed.su/embed/tv/${id}?autoplay=1` },
        { name: "AutoEmb",  url: (id) => `https://autoembed.cc/tv/tmdb/${id}?autoplay=true` },
    ],
};

/* ── helpers ─────────────────────────────── */
const fmtTime = s => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2,"0")}`;
};
const VolIcon = ({ m, v }) => {
    if (m || v === 0) return <IoVolumeOff />;
    if (v < 0.4) return <IoVolumeLow />;
    if (v < 0.7) return <IoVolumeMedium />;
    return <IoVolumeHigh />;
};

/* ── ReactPlayer wrapper with custom controls ── */
const Player = ({ url, subUrl }) => {
    const ref      = useRef(null);
    const wrap     = useRef(null);
    const hideRef  = useRef(null);
    const [playing, setPlaying]   = useState(true);
    const [muted, setMuted]       = useState(false);
    const [volume, setVolume]     = useState(0.85);
    const [played, setPlayed]     = useState(0);
    const [dur, setDur]           = useState(0);
    const [seeking, setSeeking]   = useState(false);
    const [fullsc, setFullsc]     = useState(false);
    const [ctrlVis, setCtrlVis]   = useState(true);
    const [cc, setCc]             = useState(false);
    const [buf, setBuf]           = useState(true);

    useEffect(() => {
        const fn = () => setFullsc(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", fn);
        return () => { document.removeEventListener("fullscreenchange", fn); clearTimeout(hideRef.current); };
    }, []);

    const show = () => {
        setCtrlVis(true);
        clearTimeout(hideRef.current);
        if (playing) hideRef.current = setTimeout(() => setCtrlVis(false), 3200);
    };

    const skip = s => ref.current?.seekTo(ref.current.getCurrentTime() + s, "seconds");
    const toggleFs = () => !document.fullscreenElement ? wrap.current?.requestFullscreen() : document.exitFullscreen();
    const toggleCc = () => {
        const v = ref.current?.getInternalPlayer();
        if (v?.textTracks?.[0]) { const t = v.textTracks[0]; t.mode = t.mode === "showing" ? "hidden" : "showing"; setCc(t.mode === "showing"); }
    };

    return (
        <div ref={wrap} className={`rPlayer${fullsc ? " fs" : ""}`} onMouseMove={show} onTouchStart={show}>
            {/* Video */}
            <div className="rpVideo" onClick={() => { setPlaying(p => !p); show(); }}>
                <ReactPlayer
                    ref={ref}
                    url={url}
                    playing={playing}
                    muted={muted}
                    volume={volume}
                    width="100%" height="100%"
                    controls={false}
                    onProgress={({ played: p }) => { if (!seeking) setPlayed(p); }}
                    onDuration={setDur}
                    onBuffer={() => setBuf(true)}
                    onBufferEnd={() => setBuf(false)}
                    onReady={() => setBuf(false)}
                    config={{ file: { attributes: { playsInline: true, crossOrigin: "anonymous", preload: "auto" },
                        tracks: subUrl ? [{ kind:"subtitles", src: subUrl, srcLang:"en", label:"English", default:false }] : [] } }}
                />
                {buf && <div className="rpBuf"><div className="rSpin" /></div>}
            </div>

            {/* Controls */}
            <div className={`rpCtrl${ctrlVis ? " vis" : ""}`}>
                {/* Progress */}
                <div className="rpProg">
                    <input type="range" min={0} max={0.9999} step="any" value={played}
                        style={{ "--p": `${played * 100}%` }}
                        onChange={e => { setSeeking(true); setPlayed(+e.target.value); }}
                        onMouseUp={e => { setSeeking(false); ref.current?.seekTo(+e.target.value); }}
                        onTouchEnd={e => { setSeeking(false); ref.current?.seekTo(+e.target.value); }} />
                </div>
                {/* Buttons */}
                <div className="rpRow">
                    <div className="rpLeft">
                        <button onClick={() => skip(-10)}><FiSkipBack /><span>10</span></button>
                        <button className="rpPlay" onClick={() => setPlaying(p => !p)}>
                            {playing ? <IoPause /> : <IoPlay />}
                        </button>
                        <button onClick={() => skip(10)}><span>10</span><FiSkipForward /></button>
                        <div className="rpVol">
                            <button onClick={() => setMuted(m => !m)}><VolIcon m={muted} v={volume} /></button>
                            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                                style={{ "--v": `${(muted ? 0 : volume) * 100}%` }}
                                onChange={e => { setVolume(+e.target.value); setMuted(false); }} />
                        </div>
                        <span className="rpTime">{fmtTime(played * dur)} / {fmtTime(dur)}</span>
                    </div>
                    <div className="rpRight">
                        {subUrl && <button className={`rpCc${cc ? " on" : ""}`} onClick={toggleCc}>CC</button>}
                        <button onClick={toggleFs}>{fullsc ? <IoContract /> : <IoExpand />}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── WatchModal ──────────────────────────── */
const WatchModal = ({ show, setShow, mediaType, id, title, year }) => {
    const [tab, setTab]         = useState("servers"); // default: servers (instant)
    const [status, setStatus]   = useState("idle");    // idle | searching | found | notfound
    const [videoUrl, setVidUrl] = useState(null);
    const [subUrl, setSubUrl]   = useState(null);
    const [providers, setProv]  = useState(null);
    const [provLoad, setProvL]  = useState(false);
    // Server tab state
    const [serverIdx, setServerIdx] = useState(0);
    const [iframeKey, setIframeKey] = useState(0);
    const [sStarted, setSStarted]   = useState(false);
    const [sLoading, setSLoading]   = useState(false);
    const arcSearched = useRef(false); // prevent duplicate searches

    useEffect(() => {
        if (!show) { document.body.style.overflow = ""; return; }
        document.body.style.overflow = "hidden";
        setTab("servers"); // open servers instantly
        setStatus("idle");
        setVidUrl(null);
        setSubUrl(null);
        setProv(null);
        setServerIdx(0);
        setIframeKey(k => k + 1);
        setSStarted(false);
        setSLoading(false);
        arcSearched.current = false;

        // Check sessionStorage cache first (instant)
        const cacheKey = `arc_${id}`;
        try {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                const c = JSON.parse(cached);
                setVidUrl(c.url); setSubUrl(c.sub || null); setStatus("found");
                return;
            }
        } catch {}

        return () => { document.body.style.overflow = ""; };
    }, [show, id, title]);

    // Lazy Archive.org search — only when user clicks "Watch Free" tab
    const startArchiveSearch = () => {
        if (arcSearched.current) return;
        arcSearched.current = true;
        setStatus("searching");
        const cacheKey = `arc_${id}`;
        const q = encodeURIComponent(`"${title}" AND mediatype:movies`);
        fetch(`https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier&fl[]=title&rows=8&output=json`)
            .then(r => r.json())
            .then(async d => {
                const docs = d?.response?.docs;
                if (!docs?.length) { setStatus("notfound"); return; }
                const tries = docs.slice(0, 4).map(async doc => {
                    try {
                        const meta = await fetch(`https://archive.org/metadata/${doc.identifier}`).then(r => r.json());
                        const files = meta?.files || [];

                        // Prefer small web-optimized derivatives (load 10x faster)
                        const vid =
                            files.find(f => f.name?.match(/512kb\.mp4$/i)) ||
                            files.find(f => f.name?.match(/_h\.264[_.].*\.mp4$/i)) ||
                            files.find(f => f.name?.match(/\.h264\.mp4$/i)) ||
                            files.find(f => f.source === "derivative" && f.name?.toLowerCase().endsWith(".mp4")) ||
                            // Fallback: pick smallest MP4 by file size
                            files
                                .filter(f => f.name?.toLowerCase().endsWith(".mp4") && f.size)
                                .sort((a, b) => Number(a.size) - Number(b.size))[0] ||
                            files.find(f => f.name?.toLowerCase().endsWith(".mp4")) ||
                            files.find(f => f.name?.toLowerCase().endsWith(".ogv"));

                        if (!vid) return null;
                        const base = `https://archive.org/download/${doc.identifier}/`;
                        const sub = files.find(f => f.name?.toLowerCase().endsWith(".vtt"));
                        return { url: base + encodeURIComponent(vid.name), sub: sub ? base + encodeURIComponent(sub.name) : null };
                    } catch { return null; }
                });
                const results = await Promise.allSettled(tries);
                const found = results.find(r => r.status === "fulfilled" && r.value);
                if (found?.value) {
                    setVidUrl(found.value.url);
                    setSubUrl(found.value.sub);
                    setStatus("found");
                    try { sessionStorage.setItem(cacheKey, JSON.stringify({ url: found.value.url, sub: found.value.sub })); } catch {}
                } else { setStatus("notfound"); }
            })
            .catch(() => setStatus("notfound"));
    };

    useEffect(() => {
        if (tab === "platforms" && !providers) {
            setProvL(true);
            fetchData(`/${mediaType}/${id}/watch/providers`)
                .then(d => { const r = d?.results || {}; setProv(r["IN"] || r["US"] || r["GB"] || Object.values(r)[0] || null); })
                .catch(() => setProv(null))
                .finally(() => setProvL(false));
        }
        if (tab === "watch") startArchiveSearch();
    }, [tab]);

    if (!show) return null;

    const servers  = SERVERS[mediaType] || SERVERS.movie;
    const embedUrl = servers[serverIdx].url(id);

    const switchServer = idx => {
        setServerIdx(idx);
        setIframeKey(k => k + 1);
        setSStarted(false);
        setSLoading(false);
    };

    const PGroup = ({ h, items, link }) => items?.length ? (
        <div className="pg">
            <h4>{h}</h4>
            <div className="pgList">
                {items.map(p => (
                    <a key={p.provider_id} href={link} target="_blank" rel="noopener noreferrer" className="pgItem">
                        <img src={`https://image.tmdb.org/t/p/w92${p.logo_path}`} alt={p.provider_name} />
                        <span>{p.provider_name}</span>
                    </a>
                ))}
            </div>
        </div>
    ) : null;

    return (
        <div className="watchModal">
            <div className="modalOverlay" onClick={() => setShow(false)} />
            <div className="modalContent">

                {/* Header */}
                <div className="mHdr">
                    <span className="mTit">{title}{year ? ` (${year})` : ""}</span>
                    <div className="mHdrR">
                        <button className={`mTab${tab === "watch"     ? " on" : ""}`} onClick={() => setTab("watch")}>▶ Watch Free</button>
                        <button className={`mTab${tab === "servers"   ? " on" : ""}`} onClick={() => setTab("servers")}><FiServer /> Servers</button>
                        <button className={`mTab${tab === "platforms" ? " on" : ""}`} onClick={() => setTab("platforms")}><FiTv /></button>
                        <button className="mX" onClick={() => setShow(false)}><IoClose /></button>
                    </div>
                </div>

                {/* Watch tab */}
                {tab === "watch" && (
                    <div className="watchBody">
                        {status === "searching" && (
                            <div className="wState">
                                <div className="rSpin" />
                                <p>Searching for free stream...</p>
                                <span>Looking for a direct playable video</span>
                            </div>
                        )}
                        {status === "found" && videoUrl && (
                            <>
                                <Player url={videoUrl} subUrl={subUrl} />
                                <div className="wBadge">
                                    ✅ Internet Archive · Public Domain · Full Controls · No Redirect
                                    <a href={`https://archive.org/search?query=${encodeURIComponent(title)}`}
                                        target="_blank" rel="noopener noreferrer"><FiExternalLink /></a>
                                </div>
                            </>
                        )}
                        {status === "notfound" && (
                            <div className="wState">
                                <span className="wIcon">🎬</span>
                                <h4>Not available as free stream</h4>
                                <p>This title is copyrighted and not in the public domain.<br/>Check <strong>Platforms</strong> tab for where to legally watch.</p>
                                <button className="wBtn" onClick={() => setTab("platforms")}><FiTv /> View Platforms</button>
                            </div>
                        )}
                    </div>
                )}

                {/* Servers tab */}
                {tab === "servers" && (
                    <div className="watchBody">
                        <div className="sBar">
                            <span className="sLabel">Server:</span>
                            {servers.map((s, i) => (
                                <button key={i} className={`sBtn${i === serverIdx ? " on" : ""}`}
                                    onClick={() => switchServer(i)}>{s.name}</button>
                            ))}
                            <button className="rBtn" onClick={() => switchServer(serverIdx)} title="Reload"><FiRefreshCw /></button>
                        </div>
                        <div className="sPlayerArea">
                            {!sStarted ? (
                                <div className="wState">
                                    <button className="bigPlay" onClick={() => { setSStarted(true); setSLoading(true); }}>
                                        <IoPlay />
                                    </button>
                                    <p className="pSub">Tap ▶ to load on <strong>{servers[serverIdx].name}</strong></p>
                                    <p className="pHint">Video will <strong>autoplay</strong> — no need to click inside the player. Use bottom controls for volume/fullscreen.</p>
                                </div>
                            ) : (
                                <>
                                    {sLoading && <div className="wState"><div className="rSpin" /></div>}
                                    <iframe
                                        key={iframeKey}
                                        src={embedUrl}
                                        allowFullScreen
                                        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                                        title={title}
                                        className={sLoading ? "hidden" : ""}
                                        onLoad={() => setSLoading(false)}
                                    />
                                </>
                            )}
                        </div>
                        <div className="wBadge" style={{ background: "rgba(108,99,255,0.07)", borderColor: "rgba(108,99,255,0.18)", color: "rgba(255,255,255,0.35)" }}>
                            Autoplay enabled · No need to click inside player · VidLink recommended
                        </div>
                    </div>
                )}

                {/* Platforms tab */}
                {tab === "platforms" && (
                    <div className="platBody">
                        {provLoad ? <div className="wState"><div className="rSpin" /></div>
                        : providers ? (
                            <>
                                <PGroup h="Stream" items={providers.flatrate} link={providers.link} />
                                <PGroup h="Rent"   items={providers.rent}     link={providers.link} />
                                <PGroup h="Buy"    items={providers.buy}      link={providers.link} />
                                {providers.link && <a className="tmdbL" href={providers.link} target="_blank" rel="noopener noreferrer"><FiExternalLink /> All options on TMDB</a>}
                            </>
                        ) : <div className="wState"><span>📺</span><p>No info for your region</p></div>}
                    </div>
                )}

            </div>
        </div>
    );
};

export default WatchModal;