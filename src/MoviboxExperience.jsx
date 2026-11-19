"use client";

import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Search, Home, Film, Tv, Heart, Clock3, Play, ChevronRight, ArrowLeft, Star, Plus, Check, X, Radio, ListFilter, Download, Share2 } from "lucide-react";
import "./movibox-experience.css";

const LiveTV = lazy(() => import("./LiveTV.jsx"));
const IMG = "https://image.tmdb.org/t/p";
const img = (path, size = "w500") => path ? IMG + "/" + size + path : "";
const titleOf = x => x?.title || x?.name || x?.original_title || x?.original_name || "Untitled";
const yearOf = x => (x?.release_date || x?.first_air_date || "").slice(0, 4);
const scoreOf = x => Number(x?.vote_average || 0).toFixed(1);
const mediaType = x => x?.media_type || (x?.first_air_date ? "tv" : "movie");
const categories = [["Trending","trending"],["Movies","movies"],["Series","series"],["Anime","anime"],["Bollywood","bollywood"],["Hollywood","hollywood"],["Korean","korean"],["Turkish","turkish"],["Pakistani","pakistani"],["Action","action"],["Comedy","comedy"],["Horror","horror"]];
const nav = [["Home",Home,"home"],["Movies",Film,"movies"],["Series",Tv,"series"],["My List",Heart,"list"],["History",Clock3,"history"]];

async function tmdb(path, params = {}) {
  const query = new URLSearchParams({ language: "en-US", ...params });
  const response = await fetch("/api/tmdb" + path + "?" + query);
  if (!response.ok) throw new Error("Movie catalog is temporarily unavailable (" + response.status + ").");
  return response.json();
}

function clean(data, type) {
  return (data?.results || []).filter(x => x.poster_path).map(x => ({ ...x, media_type: x.media_type || type || mediaType(x) }));
}

function Poster({ item, onOpen, rank }) {
  return <button className="mb-poster-card" onClick={() => onOpen(item)} aria-label={"Open " + titleOf(item)}>
    <span className="mb-poster">
      <img src={img(item.poster_path)} alt={titleOf(item)} loading="lazy" />
      <span className="mb-poster-shade" />
      <span className="mb-rating"><Star size={10} fill="currentColor" /> {scoreOf(item)}</span>
      {rank ? <span className={"mb-rank mb-rank-" + rank}>{rank}</span> : <span className="mb-quality">HD</span>}
    </span>
    <span className="mb-poster-title">{titleOf(item)}</span>
    <span className="mb-poster-meta">{yearOf(item) || "—"} · {mediaType(item) === "tv" ? "Series" : "Movie"}</span>
  </button>;
}

function Rail({ title, items, onOpen, action }) {
  if (!items?.length) return null;
  return <section className="mb-rail">
    <div className="mb-rail-head"><h2>{title}</h2><button onClick={action || (() => {})}>See all <ChevronRight size={15}/></button></div>
    <div className="mb-rail-track">{items.map((item, i) => <Poster key={item.id + "-" + i} item={item} onOpen={onOpen} />)}</div>
  </section>;
}

function Loading() {
  return <div className="mb-loading"><span className="mb-loader"/> <b>ZXH OFFICIAL</b><small>Preparing your cinema…</small></div>;
}

export default function MoviboxExperience() {
  const [page, setPage] = useState("home");
  const [rows, setRows] = useState({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState(null);
  const [player, setPlayer] = useState(null);
  const [activeCategory, setActiveCategory] = useState("trending");
  const [saved, setSaved] = useState([]);
  const [history, setHistory] = useState([]);
  const [rankingTab, setRankingTab] = useState("movie");
  const [rankings, setRankings] = useState([]);
  const [rankBusy, setRankBusy] = useState(false);
  const [servers, setServers] = useState([]);
  const [serverIndex, setServerIndex] = useState(0);

  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem("zxh-watchlist") || "[]"));
      setHistory(JSON.parse(localStorage.getItem("zxh-history") || "[]"));
    } catch {}
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      setBusy(true); setError("");
      try {
        const [trending, movies, series, top, now, onAir] = await Promise.all([
          tmdb("/trending/all/week"), tmdb("/movie/popular"), tmdb("/tv/popular"),
          tmdb("/movie/top_rated"), tmdb("/movie/now_playing"), tmdb("/tv/on_the_air")
        ]);
        if (!live) return;
        setRows({
          "Trending This Week": clean(trending),
          "Popular Movies": clean(movies, "movie"),
          "Popular Series": clean(series, "tv"),
          "Top Rated Movies": clean(top, "movie"),
          "Now Playing": clean(now, "movie"),
          "On Air": clean(onAir, "tv")
        });
      } catch (e) { if (live) setError(e.message); }
      finally { if (live) setBusy(false); }
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      setRankBusy(true);
      try {
        const type = rankingTab === "tv" ? "tv" : rankingTab === "anime" ? "tv" : "movie";
        const params = rankingTab === "anime" ? { with_genres: "16", with_original_language: "ja", sort_by: "popularity.desc" } : { sort_by: "vote_count.desc", "vote_count.gte": "100" };
        const data = await tmdb("/discover/" + type, params);
        if (live) setRankings(clean(data, type).slice(0, 12));
      } catch { if (live) setRankings([]); }
      finally { if (live) setRankBusy(false); }
    })();
    return () => { live = false; };
  }, [rankingTab]);

  const openDetails = async item => {
    setPage("detail"); setDetail({ ...item, loadingDetail: true }); window.scrollTo(0, 0);
    try {
      const type = mediaType(item);
      const data = await tmdb("/" + type + "/" + item.id, { append_to_response: "credits,videos,recommendations,external_ids" });
      const full = { ...data, media_type: type };
      setDetail(full);
      const next = [full, ...history.filter(x => x.id !== full.id)].slice(0, 30);
      setHistory(next); localStorage.setItem("zxh-history", JSON.stringify(next));
    } catch { setDetail({ ...item, media_type: mediaType(item) }); }
  };

  const openPlayer = async item => {
    const type = mediaType(item);
    let imdbId = item.imdb_id || "";
    try {
      const ids = await tmdb("/" + type + "/" + item.id + "/external_ids");
      imdbId = ids.imdb_id || imdbId;
    } catch {}
    const list = [
      { id:"1", name:"SERVER 1 · VIDLINK", movie:id=>"https://vidlink.pro/movie/"+id, tv:(id,s,e)=>"https://vidlink.pro/tv/"+id+"/"+s+"/"+e },
      { id:"2", name:"SERVER 2 · VIDZEE", movie:id=>"https://player.vidzee.wtf/embed/movie/"+id, tv:(id,s,e)=>"https://player.vidzee.wtf/embed/tv/"+id+"/"+s+"/"+e },
      { id:"3", name:"SERVER 3 · VIDROCK", movie:id=>"https://vidrock.net/embed/movie/"+id, tv:(id,s,e)=>"https://vidrock.net/embed/tv/"+id+"/"+s+"/"+e },
      { id:"4", name:"SERVER 4 · VIDNEST", movie:id=>"https://vidnest.fun/movie/"+id, tv:(id,s,e)=>"https://vidnest.fun/tv/"+id+"/"+s+"/"+e },
      { id:"5", name:"SERVER 5 · CINESRC", movie:id=>"https://cinesrc.st/embed/movie/"+id, tv:(id,s,e)=>"https://cinesrc.st/embed/tv/"+id+"?s="+s+"&e="+e },
      { id:"6", name:"SERVER 6 · ANYPLAY", movie:id=>"https://anyplay.stream/embed/movie/68ca4cf7203ee8afe6ee44cf/"+id, tv:(id,s,e)=>"https://anyplay.stream/embed/movie/68ca4cf7203ee8afe6ee44cf/"+id+"/"+s+"/"+e },
      { id:"7", name:"SERVER 7 · ZXH", dynamic:true },
      { id:"8", name:"SERVER 8 · MULTIEMBED", movie:id=>"https://multiembed.mov/?video_id="+id+"&tmdb=1", tv:(id,s,e)=>"https://multiembed.mov/?video_id="+id+"&tmdb=1&s="+s+"&e="+e },
      { id:"9", name:"SERVER 9 · VIDSRC", movie:id=>"https://vidsrcme.su/embed/movie/"+id, tv:(id,s,e)=>"https://vidsrcme.su/embed/tv/"+id+"/"+s+"/"+e },
      { id:"10", name:"SERVER 10 · AUTOEMBED", movie:id=>imdbId?"https://autoembed.co/movie/imdb/"+imdbId:"", tv:(id,s,e)=>imdbId?"https://autoembed.co/tv/imdb/"+imdbId+"-"+s+"-"+e:"" },
      { id:"11", name:"SERVER 11 · 2EMBED", movie:id=>imdbId?"https://www.2embed.cc/embed/"+imdbId:"", tv:(id,s,e)=>imdbId?"https://www.2embed.cc/embedtv/"+imdbId+"&s="+s+"&e="+e:"" }
    ];
    setServers(list); setServerIndex(0); setPlayer({ ...item, media_type: type }); setPage("player"); window.scrollTo(0,0);
  };

  const toggleSaved = item => {
    const next = saved.some(x => x.id === item.id) ? saved.filter(x => x.id !== item.id) : [{ ...item }, ...saved];
    setSaved(next); localStorage.setItem("zxh-watchlist", JSON.stringify(next));
  };

  const go = key => { setPage(key); if (key !== "detail") setDetail(null); if (key !== "player") setPlayer(null); setError(""); window.scrollTo(0,0); };
  const runSearch = async e => {
    e?.preventDefault(); const q = search.trim(); if (!q) return;
    setQuery(q); setPage("search"); setBusy(true); setError("");
    try { const data = await tmdb("/search/multi", { query:q, include_adult:"false" }); setRows(r => ({ ...r, "Search Results": clean({ results:(data.results || []).filter(x => ["movie","tv"].includes(x.media_type)) }) })); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
    window.scrollTo(0,0);
  };

  const chooseCategory = async (key, label) => {
    setActiveCategory(key); setPage("category"); setBusy(true); setError(""); window.scrollTo(0,0);
    try {
      const fixed = key === "movies" ? [["Trending Movies","/trending/movie/week","movie"],["Popular Movies","/movie/popular","movie"],["Top Rated","/movie/top_rated","movie"]] :
        key === "series" ? [["Trending Series","/trending/tv/week","tv"],["Popular Series","/tv/popular","tv"],["Top Rated Series","/tv/top_rated","tv"]] : null;
      if (fixed) {
        const loaded = await Promise.all(fixed.map(async ([name,path,type]) => [name, clean(await tmdb(path), type)]));
        setRows(r => Object.fromEntries(loaded));
      } else {
        let type = ["anime","korean","turkish"].includes(key) ? "tv" : "movie";
        let params = { sort_by:"popularity.desc" };
        if (key === "anime") params = { ...params, with_genres:"16", with_original_language:"ja" };
        if (key === "korean") params.with_original_language = "ko";
        if (key === "turkish") params.with_original_language = "tr";
        if (key === "bollywood") params = { ...params, with_original_language:"hi", region:"IN" };
        if (key === "hollywood") params = { ...params, with_original_language:"en", region:"US" };
        if (key === "pakistani") params.with_original_language = "ur";
        if (key === "action") params.with_genres = "28";
        if (key === "comedy") params.with_genres = "35";
        if (key === "horror") params.with_genres = "27";
        const data = await tmdb("/discover/" + type, params);
        setRows({ [label + " Collection"]: clean(data, type) });
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const visibleRows = useMemo(() => {
    if (page === "list") return { "My List": saved };
    if (page === "history") return { "Recently Viewed": history };
    if (page === "movies") return Object.fromEntries(Object.entries(rows).filter(([k]) => /Movie|Now Playing/.test(k)));
    if (page === "series") return Object.fromEntries(Object.entries(rows).filter(([k]) => /Series|On Air/.test(k)));
    if (page === "search") return { "Search Results": rows["Search Results"] || [] };
    return rows;
  }, [page, rows, saved, history]);

  const currentServer = player && servers[serverIndex];
  const playerUrl = player && currentServer && (player.media_type === "tv" ? currentServer.tv?.(player.id, 1, 1) : currentServer.movie?.(player.id));
  const trailer = detail?.videos?.results?.find(v => v.site === "YouTube" && ["Trailer","Teaser"].includes(v.type) && v.key);

  return <div className="mb-app">
    <header className="mb-top">
      <button className="mb-brand" onClick={() => go("home")}><span className="mb-logo">Z</span><span>ZXH <b>OFFICIAL</b></span></button>
      <form className="mb-search" onSubmit={runSearch}><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search movies, series…"/><button type="submit">Search</button></form>
      <button className="mb-icon-btn" onClick={() => go("list")} aria-label="My list"><Heart size={19}/></button>
    </header>

    {page !== "detail" && page !== "player" && page !== "live" && <div className="mb-categories">{categories.map(([label,key])=><button key={key} className={activeCategory===key?"active":""} onClick={()=>chooseCategory(key,label)}>{label}</button>)}</div>}

    {page === "home" && <div className="mb-type-switch"><button className="active" onClick={()=>go("home")}>Movies &amp; Series</button><button onClick={()=>go("shorts")}>Shorts</button></div>}

    {page === "detail" && detail && <main className="mb-detail-page">
      <button className="mb-back" onClick={()=>go("home")}><ArrowLeft size={17}/> Back</button>
      <div className="mb-detail-hero" style={{backgroundImage:detail.backdrop_path ? "linear-gradient(0deg,#101114 2%,rgba(16,17,20,.35) 70%),url("+img(detail.backdrop_path,"w1280")+")" : "linear-gradient(135deg,#202522,#101114)"}}>
        <div className="mb-detail-poster"><img src={img(detail.poster_path)} alt={titleOf(detail)}/></div>
        <div className="mb-detail-copy"><span className="mb-kicker">{mediaType(detail)==="tv"?"TV SERIES":"MOVIE"} · {yearOf(detail)}</span><h1>{titleOf(detail)}</h1><div className="mb-detail-meta"><span><Star size={14} fill="currentColor"/> {scoreOf(detail)}</span><span>{detail.runtime ? detail.runtime+" min" : detail.number_of_seasons ? detail.number_of_seasons+" Seasons" : "HD"}</span></div><p>{detail.overview || "Explore this title on ZXH OFFICIAL."}</p><div className="mb-detail-actions"><button className="mb-watch" onClick={()=>openPlayer(detail)}><Play size={17} fill="currentColor"/> Watch now</button><button className="mb-save" onClick={()=>toggleSaved(detail)}>{saved.some(x=>x.id===detail.id)?<Check/>:<Plus/>}{saved.some(x=>x.id===detail.id)?" Saved":" My List"}</button></div></div>
      </div>
      {trailer && <div className="mb-trailer"><h3>Official Trailer</h3><iframe src={"https://www.youtube-nocookie.com/embed/"+trailer.key} title="Trailer" allowFullScreen/></div>}
      <Rail title="You may also like" items={clean(detail.recommendations)} onOpen={openDetails}/>
      <section className="mb-detail-info"><h3>About this title</h3><p>{detail.overview}</p><div>{(detail.genres||[]).map(g=><span key={g.id}>{g.name}</span>)}</div></section>
    </main>}

    {page === "player" && player && <main className="mb-player-page"><button className="mb-back" onClick={()=>go("detail")}><ArrowLeft size={17}/> Back to details</button><h1>{titleOf(player)}</h1><div className="mb-player-frame">{playerUrl ? <iframe src={playerUrl} title={titleOf(player)+" player"} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen/> : <div className="mb-player-unavailable">This server needs a supported title ID.</div>}</div><div className="mb-server-label">SELECT PLAYBACK SERVER</div><div className="mb-server-grid">{servers.map((s,i)=><button key={s.id} className={serverIndex===i?"active":""} onClick={()=>setServerIndex(i)}>{s.name}</button>)}</div><p className="mb-player-note">Playback availability depends on the selected third-party source.</p></main>}

    {page === "live" && <Suspense fallback={<Loading/>}><LiveTV/></Suspense>}
    {page !== "detail" && page !== "player" && page !== "live" && page !== "shorts" && <main className="mb-content">
      {page === "home" && <section className="mb-ranking"><div className="mb-section-head"><h2>Top Ranking</h2><span>HOT</span></div><div className="mb-ranking-tabs">{[["movie","Movies"],["tv","TV Series"],["anime","Anime"]].map(([key,label])=><button key={key} className={rankingTab===key?"active":""} onClick={()=>setRankingTab(key)}>{label}</button>)}</div><div className="mb-rank-track">{rankBusy ? Array.from({length:6},(_,i)=><div className="mb-skeleton" key={i}/>) : rankings.map((item,i)=><div className="mb-rank-item" key={item.id}><Poster item={item} onOpen={openDetails} rank={i+1}/></div>)}</div></section>}
      {page === "search" && <div className="mb-page-heading"><span>SEARCH</span><h1>Results for “{query}”</h1></div>}
      {page === "category" && <div className="mb-page-heading"><span>COLLECTION</span><h1>{categories.find(x=>x[1]===activeCategory)?.[0] || "Discover"}</h1></div>}
      {page === "list" && <div className="mb-page-heading"><span>YOUR LIBRARY</span><h1>My List</h1></div>}
      {page === "history" && <div className="mb-page-heading"><span>RECENTLY WATCHED</span><h1>History</h1></div>}
      {error && <div className="mb-error">{error}</div>}
      {busy ? <Loading/> : Object.entries(visibleRows).map(([name,items])=><Rail key={name} title={name} items={items} onOpen={openDetails}/>)}
      {!busy && Object.values(visibleRows).every(x=>!x?.length) && <div className="mb-empty"><Film size={28}/><b>No titles to show</b><span>Choose another category or search for a title.</span></div>}
      {page === "home" && <><Rail title="Trending This Week" items={rows["Trending This Week"]} onOpen={openDetails}/><Rail title="Popular Movies" items={rows["Popular Movies"]} onOpen={openDetails}/><Rail title="Popular Series" items={rows["Popular Series"]} onOpen={openDetails}/><Rail title="Top Rated Movies" items={rows["Top Rated Movies"]} onOpen={openDetails}/><Rail title="Now Playing" items={rows["Now Playing"]} onOpen={openDetails}/><Rail title="On Air" items={rows["On Air"]} onOpen={openDetails}/></>}
    </main>}

    {page === "shorts" && <main className="mb-content"><div className="mb-empty"><Film size={28}/><b>Shorts</b><span>Short-form feed layout is ready for its dedicated content source.</span></div></main>}

    {page !== "detail" && page !== "player" && <nav className="mb-bottom-nav">{nav.map(([label,Icon,key])=><button key={key} className={page===key?"active":""} onClick={()=>go(key)}><Icon size={20}/><span>{label}</span></button>)}<button className={page==="live"?"active":""} onClick={()=>go("live")}><Radio size={20}/><span>Live</span></button></nav>}
    <footer className="mb-footer">POWERED BY <b>ZXH OFFICIAL</b><span>Created by ZULQARNAIN X HAIDER</span></footer>
  </div>;
}
