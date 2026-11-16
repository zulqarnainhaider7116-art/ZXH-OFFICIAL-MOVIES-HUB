import React, {useEffect, useMemo, useRef, useState} from "react";
import { createRoot } from "react-dom/client";
import {
  Search, Home, Film, Tv, Heart, Clock3, UserRound, Menu, X, Play,
  Plus, Check, Star, ChevronRight, ChevronLeft, Info, SlidersHorizontal,
  Sparkles, Bookmark, History, ArrowLeft, LoaderCircle, AlertCircle
} from "lucide-react";
import "./styles.css";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY || "5842b1e115a82d3dd7d335874888c943";
const API_BASE = import.meta.env.VITE_TMDB_BASE_URL || "https://api.themoviedb.org/3";
const IMG_BASE = import.meta.env.VITE_TMDB_IMAGE_BASE || "https://image.tmdb.org/t/p";

const api = async (path, params={}) => {
  const qs = new URLSearchParams({api_key: API_KEY, language:"en-US", ...params});
  const res = await fetch(`${API_BASE}${path}?${qs}`);
  if(!res.ok) throw new Error(`TMDB request failed (${res.status})`);
  return res.json();
};
const img = (path, size="w500") => path ? `${IMG_BASE}/${size}${path}` : "";
const backdrop = (path, size="original") => path ? `${IMG_BASE}/${size}${path}` : "";
const titleOf = x => x?.title || x?.name || x?.original_title || x?.original_name || "Untitled";
const yearOf = x => (x?.release_date || x?.first_air_date || "").slice(0,4);
const scoreOf = x => Number(x?.vote_average || 0).toFixed(1);

const navItems = [
  ["Home", Home, "home"], ["Movies", Film, "movie"], ["Series", Tv, "tv"],
  ["My List", Heart, "list"], ["History", Clock3, "history"]
];

function App(){
  const [page,setPage] = useState("home");
  const [mobileOpen,setMobileOpen] = useState(false);
  const [hero,setHero] = useState(null);
  const [rows,setRows] = useState({});
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [selected,setSelected] = useState(null);
  const [player,setPlayer] = useState(null);
  const [playerBackPage,setPlayerBackPage] = useState("home");
  const [search,setSearch] = useState("");
  const [query,setQuery] = useState("");
  const [youtubeSearchResults,setYoutubeSearchResults] = useState([]);
  const [youtubeSearchError,setYoutubeSearchError] = useState("");
  const [youtubeSearchLoading,setYoutubeSearchLoading] = useState(false);
  const [watchlist,setWatchlist] = useState(()=>JSON.parse(localStorage.getItem("zxh-watchlist")||"[]"));
  const [history,setHistory] = useState(()=>JSON.parse(localStorage.getItem("zxh-history")||"[]"));

  const saveList=(key,value)=>{ localStorage.setItem(key,JSON.stringify(value)); };
  const isSaved = id => watchlist.some(x=>x.id===id);
  const toggleWatch = item => {
    const next = isSaved(item.id) ? watchlist.filter(x=>x.id!==item.id) : [item,...watchlist];
    setWatchlist(next); saveList("zxh-watchlist",next);
  };
  const addHistory = item => {
    const next=[item,...history.filter(x=>x.id!==item.id)].slice(0,30);
    setHistory(next); saveList("zxh-history",next);
  };

  useEffect(()=>{
    const load=async()=>{
      try{
        setLoading(true); setError("");
        const [trending,popularM,popularTV,topM,nowM,airTV] = await Promise.all([
          api("/trending/all/week"),
          api("/movie/popular",{region:"US"}),
          api("/tv/popular"),
          api("/movie/top_rated",{region:"US"}),
          api("/movie/now_playing",{region:"US"}),
          api("/tv/on_the_air")
        ]);
        const clean=a=>a.results?.filter(x=>x.poster_path) || [];
        const trend=clean(trending);
        setHero(trend[0]);
        setRows({
          "Trending This Week":trend,
          "Popular Movies":clean(popularM),
          "Popular Series":clean(popularTV),
          "Top Rated":clean(topM),
          "Now Playing":clean(nowM),
          "On Air":clean(airTV)
        });
      }catch(e){setError(e.message || "Unable to load movies.");}
      finally{setLoading(false);}
    };
    load();
  },[]);

  useEffect(()=>{
    if(!selected) return;
    document.body.style.overflow="hidden";
    const onKey=e=>e.key==="Escape" && setSelected(null);
    window.addEventListener("keydown",onKey);
    return ()=>{document.body.style.overflow="";window.removeEventListener("keydown",onKey)};
  },[selected]);

  const go = key => { setPage(key); setMobileOpen(false); setSearch(""); setQuery(""); setPlayer(null); window.scrollTo({top:0,behavior:"smooth"}); };

  const openPlayer = entry => { setPlayerBackPage(page === "player" ? playerBackPage : page); setPlayer(entry); setSelected(null); setPage("player"); window.scrollTo({top:0,behavior:"smooth"}); };
  const closePlayer = () => { setPlayer(null); setPage(playerBackPage || "home"); window.scrollTo({top:0,behavior:"smooth"}); };

  const openDetails=async(item)=>{
    try{
      const type=item.media_type || (item.first_air_date ? "tv":"movie");
      const data=await api(`/${type}/${item.id}`,{append_to_response:"credits,videos,recommendations"});
      setSelected({...data,media_type:type});
      addHistory({...item,media_type:type});
    }catch(e){setError("Could not open this title.");}
  };

  const doSearch=async(e)=>{
    e?.preventDefault();
    const q=search.trim(); if(!q) return;
    setLoading(true); setPage("search"); setQuery(q);
    setYoutubeSearchLoading(true); setYoutubeSearchError(""); setYoutubeSearchResults([]);
    window.scrollTo({top:0,behavior:"smooth"});
    const [tmdbResult,youtubeResult]=await Promise.allSettled([
      api("/search/multi",{query:q,include_adult:"false"}),
      fetch("/api/youtube/search?q="+encodeURIComponent(q)).then(async response=>{
        const payload=await response.json().catch(()=>({}));
        if(!response.ok||payload.error) throw new Error(payload.error?.message||payload.error||"YouTube search failed.");
        return payload.results||[];
      })
    ]);
    if(tmdbResult.status==="fulfilled"){
      const data=tmdbResult.value;
      setRows(r=>({...r,"Search Results":data.results?.filter(x=>(x.media_type==="movie"||x.media_type==="tv")&&x.poster_path)||[]}));
    }else{
      setRows(r=>({...r,"Search Results":[]}));
      setError("TMDB search failed.");
    }
    if(youtubeResult.status==="fulfilled"){
      setYoutubeSearchResults(youtubeResult.value);
      if(!youtubeResult.value.length) setYoutubeSearchError("No embeddable long-form YouTube videos found for this search.");
    }else setYoutubeSearchError(youtubeResult.reason?.message||"YouTube search is unavailable. Check YOUTUBE_API_KEY in Vercel Environment Variables.");
    setYoutubeSearchLoading(false); setLoading(false);
  };

  const sectionData = useMemo(()=>{
    if(page==="list") return {"My List":watchlist};
    if(page==="history") return {"Continue Exploring":history};
    if(page==="movie") return {"Popular Movies":rows["Popular Movies"]||[],"Top Rated":rows["Top Rated"]||[]};
    if(page==="tv") return {"Popular Series":rows["Popular Series"]||[],"On Air":rows["On Air"]||[]};
    if(page==="search") return {"Search Results":rows["Search Results"]||[]};
    return rows;
  },[page,rows,watchlist,history]);

  return <div className="app">
    <div className="ambient a1"/><div className="ambient a2"/><div className="grain"/>
    <Header search={search} setSearch={setSearch} submit={doSearch} open={mobileOpen} setOpen={setMobileOpen} go={go} page={page}/>
    {error && <div className="toast"><AlertCircle size={17}/>{error}<button onClick={()=>setError("")}><X size={15}/></button></div>}
    {loading && !hero ? <div className="loading-screen"><LoaderCircle className="spin" size={34}/><span>Loading cinema…</span></div> :
      <>
        {page==="player" && player ? <PlayerScreen entry={player} onBack={closePlayer}/> : <>
        {page==="home" && hero && <Hero item={hero} openDetails={openDetails} toggleWatch={toggleWatch} saved={isSaved(hero.id)}/>}
        <main className={page==="home" ? "content home-content":"content"}>
          {page==="search" && <div className="page-head"><div><span className="eyebrow">DISCOVER</span><h1>Results for “{query}”</h1></div><button className="glass-btn" onClick={()=>go("home")}><ArrowLeft size={16}/> Home</button></div>}
          {page==="list" && <PageTitle icon={<Heart/>} title="My List" text="Your saved cinematic picks."/>}
          {page==="history" && <PageTitle icon={<History/>} title="History" text="Recently explored titles."/>}
          {Object.entries(sectionData).map(([name,items])=><MovieRow key={name} title={name} items={items} openDetails={openDetails}/>)}
          {page==="search"&&<YouTubeSearchRow items={youtubeSearchResults} loading={youtubeSearchLoading} error={youtubeSearchError} openPlayer={openPlayer}/>}
          {Object.values(sectionData).every(a=>!a?.length) && <Empty page={page}/>}
        </main>
        <Footer/>
        </>}
      </>
    }
    {selected && <Details item={selected} close={()=>setSelected(null)} toggleWatch={toggleWatch} saved={isSaved(selected.id)} openDetails={openDetails} openPlayer={openPlayer}/>}
    {page!=="player" && <MobileNav page={page} go={go}/>}
  </div>
}


function YouTubeSearchRow({items,loading,error,openPlayer}){
  if(!loading&&!error&&!items.length) return null;
  return <section className="row-section youtube-search-section">
    <div className="row-head"><div><span className="eyebrow">WATCH INSIDE ZXH</span><h2>YouTube Search Results</h2></div><span className="fak-powered">Embedded videos only</span></div>
    {loading&&<p>Searching YouTube…</p>}
    {error&&<p className="fak-error">{error}</p>}
    {items.length>0&&<div className="mini-grid">{items.map((video,index)=><button className="movie-card" key={video.id+"-"+index} onClick={()=>openPlayer({kind:"youtube",source:"youtube",youtubeId:video.id,title:video.title,poster:video.thumbnail,channel:video.channel,duration:video.duration,description:video.description,youtubeQueue:items,youtubeIndex:index})}>
      <div className="poster"><img src={video.thumbnail||""} alt={video.title} loading="lazy"/><span className="card-play"><Play size={18} fill="currentColor"/></span></div>
      <div className="card-info"><strong>{video.title}</strong><span>{video.channel||"YouTube"} · {video.duration||"Duration unavailable"}</span></div>
    </button>)}</div>}
  </section>;
}

function Header({search,setSearch,submit,open,setOpen,go,page}){
  return <header className="header glass">
    <button className="brand" onClick={()=>go("home")} aria-label="ZXH Movies home">
      <span className="brand-mark">Z</span><span>ZXH <b>MOVIES</b></span>
    </button>
    <nav className="desktop-nav">{navItems.map(([label,Icon,key])=><button className={page===key?"active":""} key={key} onClick={()=>go(key)}><Icon size={16}/>{label}</button>)}</nav>
    <form className="searchbox" onSubmit={submit}><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search movies & series…"/>{search&&<button type="button" onClick={()=>setSearch("")}><X size={14}/></button>}</form>
    <button className="menu-btn" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
    {open&&<div className="mobile-menu glass">{navItems.map(([label,Icon,key])=><button key={key} onClick={()=>go(key)}><Icon size={18}/>{label}</button>)}</div>}
  </header>
}

function Hero({item,openDetails,toggleWatch,saved}){
  return <section className="hero" style={{"--hero":`url(${backdrop(item.backdrop_path)})`}}>
    <div className="hero-shade"/>
    <div className="hero-content">
      <div className="eyebrow"><Sparkles size={14}/> FEATURED THIS WEEK</div>
      <h1>{titleOf(item)}</h1>
      <div className="meta"><span className="rating"><Star size={14} fill="currentColor"/> {scoreOf(item)}</span><span>{yearOf(item)||"—"}</span><span>{item.media_type==="tv"?"Series":"Movie"}</span><span>HD</span></div>
      <p>{item.overview || "Discover a new cinematic favorite with ZXH Movies."}</p>
      <div className="hero-actions">
        <button className="primary-btn" onClick={()=>openDetails(item)}><Play size={17} fill="currentColor"/> Watch Details</button>
        <button className="glass-btn" onClick={()=>toggleWatch(item)}>{saved?<Check size={17}/>:<Plus size={17}/>} {saved?"In My List":"My List"}</button>
      </div>
    </div>
    <div className="hero-poster"><img src={img(item.poster_path,"w780")} alt={titleOf(item)} loading="eager"/></div>
    <div className="scroll-cue">SCROLL TO EXPLORE <ChevronRight size={15}/></div>
  </section>
}

function MovieRow({title,items,openDetails}){
  const [offset,setOffset]=useState(0);
  if(!items?.length) return null;
  const move=d=>setOffset(v=>Math.max(0,Math.min(Math.max(items.length-5,0),v+d)));
  return <section className="row-section">
    <div className="row-head"><div><span className="eyebrow">COLLECTION</span><h2>{title}</h2></div><div className="row-controls"><button onClick={()=>move(-4)}><ChevronLeft/></button><button onClick={()=>move(4)}><ChevronRight/></button></div></div>
    <div className="cards-viewport"><div className="cards" style={{transform:`translateX(calc(-${offset} * (var(--card-w) + var(--gap))))`}}>
      {items.map((item,i)=><MovieCard key={`${item.id}-${i}`} item={item} openDetails={openDetails}/>)}
    </div></div>
  </section>
}

function MovieCard({item,openDetails}){
  return <button className="movie-card" onClick={()=>openDetails(item)}>
    <div className="poster"><img src={img(item.poster_path,"w500")} alt={titleOf(item)} loading="lazy"/><div className="poster-gloss"/><span className="score"><Star size={11} fill="currentColor"/>{scoreOf(item)}</span><span className="quality">HD</span><span className="card-play"><Play size={18} fill="currentColor"/></span></div>
    <div className="card-info"><strong>{titleOf(item)}</strong><span>{yearOf(item)||"—"} <i/> {item.media_type==="tv"||item.first_air_date?"TV":"Movie"}</span></div>
  </button>
}

function PageTitle({icon,title,text}){return <div className="page-title"><div className="title-icon">{icon}</div><div><span className="eyebrow">YOUR SPACE</span><h1>{title}</h1><p>{text}</p></div></div>}
function Empty({page}){return <div className="empty"><Bookmark size={34}/><h3>{page==="search"?"No titles found":"Nothing here yet"}</h3><p>Try another collection or search for a different title.</p></div>}

function Details({item,close,toggleWatch,saved,openDetails,openPlayer}){
  const [showTrailer,setShowTrailer]=useState(false);
  const [activeSource,setActiveSource]=useState("");
  const activateSource=(source)=>{setActiveSource(source);setShowTrailer(false);setFakResults([]);setFakEpisodes([]);setFakPlayer(null);setFakError("");setFakLoading(false);setYoutubeResults([]);setYoutubeError("");setYoutubeLoading(false);setArchiveResults([]);setArchiveError("");setArchiveLoading(false);};
  const [fakResults,setFakResults]=useState([]);
  const [fakLoading,setFakLoading]=useState(false);
  const [fakError,setFakError]=useState("");
  const [fakEpisodes,setFakEpisodes]=useState([]);
  const [fakPlayer,setFakPlayer]=useState(null);
  const [archiveResults,setArchiveResults]=useState([]);
  const [archiveLoading,setArchiveLoading]=useState(false);
  const [archiveError,setArchiveError]=useState("");
  const [youtubeResults,setYoutubeResults]=useState([]);
  const [youtubeLoading,setYoutubeLoading]=useState(false);
  const [youtubeError,setYoutubeError]=useState("");
  const findFakTitle=async()=>{
    activateSource("fak");
    setFakLoading(true);setFakError("");setFakResults([]);setFakEpisodes([]);setFakPlayer(null);
    try{
      const kind=item.media_type==="tv"?"all":"movie";
      const response=await fetch("/api/fak/search?q="+encodeURIComponent(titleOf(item))+"&type="+kind);
      const contentType=response.headers.get("content-type")||"";
      if(!contentType.includes("application/json")) throw new Error("Movies API returned "+(contentType||"an unknown response")+" (HTTP "+response.status+"). The upstream provider may be blocking the request.");
      const payload=await response.json();
      if(!response.ok||payload.error) throw new Error(payload.error?.message||"ZXH-OFFICIAL LAB CREW API search failed.");
      const allResults=payload.data?.results||[];
      const results=item.media_type==="tv"?allResults.filter(x=>x.type==="series"||x.type==="anime"):allResults.filter(x=>x.type==="movie");
      setFakResults(results);
      if(!results.length)setFakError("No matching title was found in ZXH-OFFICIAL LAB CREW API.");
    }catch(e){setFakError(e.message||"Unable to search ZXH-OFFICIAL LAB CREW API.");}
    finally{setFakLoading(false);}
  };
  const chooseFakResult=async(result)=>{
    setFakError("");
    if(result.type==="series"||result.type==="anime"){
      setFakLoading(true);
      try{
        const response=await fetch("/api/fak/series/"+encodeURIComponent(result.id));
        const contentType=response.headers.get("content-type")||"";
        if(!contentType.includes("application/json")) throw new Error("Movie API route is not responding with JSON yet. Please retry after deployment.");
        const payload=await response.json();
        if(!response.ok||payload.error) throw new Error(payload.error?.message||"Could not load series episodes.");
        const detail=payload.data||payload.result||payload;
        const episodes=detail.episodes||detail.data?.episodes||[];setFakEpisodes(episodes);setFakPlayer(null);
        if(!episodes.length)setFakError("No episodes are listed for this series.");
      }catch(e){setFakError(e.message||"Unable to load episodes.");}
      finally{setFakLoading(false);}
    }else{
      setFakLoading(true);
      try{
        const response=await fetch("/api/fak/movie-detail?slug="+encodeURIComponent(result.id));
        const contentType=response.headers.get("content-type")||"";
        if(!contentType.includes("application/json")) throw new Error("Movie details endpoint did not return JSON.");
        const payload=await response.json();
        if(!response.ok||payload.error) throw new Error(payload.error?.message||"Could not load movie details.");
        const detail=payload.data||payload.result||payload;
        openPlayer({kind:"movie",id:result.id,title:detail.title||result.title,detail,poster:detail.poster||result.image||""});
      }catch(e){setFakError(e.message||"Unable to load movie details.");}
      finally{setFakLoading(false);}
    }
  };
  const findYouTubeVideos=async()=>{
    activateSource("youtube");
    setYoutubeLoading(true);setYoutubeError("");setYoutubeResults([]);
    try{
      const suffix=item.media_type==="tv"?" full episodes":" full movie";
      const response=await fetch("/api/youtube/search?q="+encodeURIComponent(titleOf(item)+suffix));
      const payload=await response.json();
      if(!response.ok||payload.error) throw new Error(payload.error?.message||"YouTube search failed.");
      setYoutubeResults(payload.results||[]);
      if(!(payload.results||[]).length)setYoutubeError("No embeddable long-form YouTube videos found. Try another title.");
    }catch(e){setYoutubeError(e.message||"Unable to search YouTube.");}
    finally{setYoutubeLoading(false);}
  };
  const findArchiveStreams=async()=>{
    activateSource("archive");
    setArchiveLoading(true);setArchiveError("");setArchiveResults([]);
    try{
      const response=await fetch("/api/archive/search?q="+encodeURIComponent(titleOf(item)));
      const payload=await response.json();
      if(!response.ok||payload.error) throw new Error(payload.error?.message||"Public-domain source search failed.");
      setArchiveResults(payload.results||[]);
      if(!(payload.results||[]).length)setArchiveError("No verified public-domain / Creative Commons playable copy was found for this title.");
    }catch(e){setArchiveError(e.message||"Unable to search legal free sources.");}
    finally{setArchiveLoading(false);}
  };
  const [autoWatchLoading,setAutoWatchLoading]=useState(false);
  const [autoWatchError,setAutoWatchError]=useState("");
  const watchNow=async()=>{
    if(autoWatchLoading)return;
    setAutoWatchLoading(true);setAutoWatchError("");setActiveSource("");
    const title=titleOf(item);
    try{
      // Priority 1: configured Movies API. Only use its returned playback route.
      try{
        const kind=item.media_type==="tv"?"all":"movie";
        const r=await fetch("/api/fak/search?q="+encodeURIComponent(title)+"&type="+kind);
        const p=await r.json();
        if(r.ok&&!p.error){
          const results=(p.data?.results||[]).filter(x=>item.media_type==="tv"?(x.type==="series"||x.type==="anime"):x.type==="movie");
          if(results.length){
            const selected=results[0];
            if(selected.type==="series"||selected.type==="anime"){
              const er=await fetch("/api/fak/series/"+encodeURIComponent(selected.id));
              const ep=await er.json();
              const detail=ep.data||ep.result||ep;
              const first=(detail.episodes||detail.data?.episodes||[])[0];
              if(first){openPlayer({kind:"episode",id:first.id,title:first.title||"Episode 1",detail:first,poster:selected.image||""});return;}
            }else{
              const dr=await fetch("/api/fak/movie-detail?slug="+encodeURIComponent(selected.id));
              const dp=await dr.json();
              const detail=dp.data||dp.result||dp;
              if(dr.ok&&!dp.error&&detail) {openPlayer({kind:"movie",id:selected.id,title:detail.title||selected.title,detail,poster:detail.poster||selected.image||""});return;}
            }
          }
        }
      }catch{}
      // Priority 2: playable public-domain / Creative Commons copy.
      try{
        const r=await fetch("/api/archive/search?q="+encodeURIComponent(title));
        const p=await r.json();
        const first=(p.results||[])[0];
        if(r.ok&&!p.error&&first?.url){openPlayer({kind:"archive",source:"archive",id:first.id,title:first.title,poster:first.poster,streamUrl:first.url,format:first.format,license:first.license});return;}
      }catch{}
      // Priority 3: official YouTube embed. Its source attribution/player branding remains visible.
      try{
        const suffix=item.media_type==="tv"?" full episodes":" full movie";
        const r=await fetch("/api/youtube/search?q="+encodeURIComponent(title+suffix));
        const p=await r.json();
        const first=(p.results||[])[0];
        if(r.ok&&!p.error&&first?.id){openPlayer({kind:"youtube",source:"youtube",youtubeId:first.id,title:first.title,poster:first.thumbnail,channel:first.channel,duration:first.duration,description:first.description,youtubeQueue:p.results,youtubeIndex:0});return;}
      }catch{}
      setAutoWatchError("Is title ke liye abhi koi playable source nahi mila. Provider availability ya playback rights check karein.");
    }finally{setAutoWatchLoading(false);}
  };
  const trailer=item.videos?.results?.find(v=>v.site==="YouTube"&&v.type==="Trailer"&&v.key)
    || item.videos?.results?.find(v=>v.site==="YouTube"&&v.type==="Teaser"&&v.key);
  const cast=item.credits?.cast?.slice(0,8)||[];
  const rec=item.recommendations?.results?.filter(x=>x.poster_path).slice(0,8)||[];
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&close()}>
    <div className="details-modal">
      <button className="modal-close" onClick={close}><X/></button>
      <div className="details-cover" style={{"--cover":`url(${backdrop(item.backdrop_path)})`}}>
        <div className="cover-shade"/>
        <div className="details-top">
          <img src={img(item.poster_path,"w500")} alt={titleOf(item)}/>
          <div className="details-copy">
            <span className="eyebrow">{item.media_type==="tv"?"SERIES":"MOVIE"} • TMDB</span>
            <h1>{titleOf(item)}</h1>
            <div className="meta"><span className="rating"><Star size={14} fill="currentColor"/> {scoreOf(item)}</span><span>{yearOf(item)||"—"}</span><span>{item.runtime?`${item.runtime} min`:item.number_of_seasons?`${item.number_of_seasons} Seasons`:"HD"}</span></div>
            <p>{item.overview || "No overview available."}</p>
            <div className="hero-actions"><button className="primary-btn" onClick={watchNow} disabled={autoWatchLoading}><Play size={17} fill="currentColor"/> {autoWatchLoading?"Finding best stream…":"WATCH"}</button><button className="glass-btn" onClick={()=>toggleWatch(item)}>{saved?<Check/>:<Plus/>}{saved?" In My List":" Add to List"}</button></div>{autoWatchError&&<p className="fak-error" role="status">{autoWatchError}</p>}
            <div className="genres">{item.genres?.map(g=><span key={g.id}>{g.name}</span>)}</div>
          </div>
        </div>
      </div>
      <div className="details-body">
        {activeSource==="fak"&&(fakLoading||fakError||fakResults.length>0||fakEpisodes.length>0||fakPlayer)&&<div className="detail-block fak-block">
          <div className="trailer-heading"><div><h3>Watch with ZXH-OFFICIAL LAB CREW API</h3><span className="fak-powered">Powered by ZXH-OFFICIAL LAB CREW</span></div>{fakResults.length>0&&<button className="glass-btn" onClick={()=>{setFakResults([]);setFakEpisodes([]);setFakPlayer(null);setFakError("");}}>Reset</button>}</div>
          {fakLoading&&<p>Searching available sources…</p>}
          {fakError&&<p className="fak-error">{fakError}</p>}
          {fakResults.length>0&&<div className="fak-results">{fakResults.map((result,index)=><button className="fak-result" key={result.id||index} onClick={()=>chooseFakResult(result)}><img src={result.image||""} alt="" loading="lazy"/><span><strong>{result.title}</strong><small>{result.year||"Year unavailable"} · {result.type} {result.views?"· "+result.views+" views":""}</small></span><ChevronRight size={18}/></button>)}</div>}
          {fakEpisodes.length>0&&<div className="fak-results">{fakEpisodes.map((episode,index)=><button className="fak-result fak-episode" key={episode.id||index} onClick={()=>openPlayer({kind:"episode",id:episode.id,title:episode.title||"Episode "+(episode.episode||index+1),detail:episode})}><span className="episode-number">{episode.episode||index+1}</span><span><strong>{episode.title||"Episode "+(episode.episode||index+1)}</strong><small>Season {episode.season||1} · Episode {episode.episode||index+1}</small></span><Play size={17}/></button>)}</div>}
          {fakPlayer&&<button className="primary-btn" onClick={()=>openPlayer(fakPlayer)}><Play size={16}/> Open separate player</button>}
        </div>}
        {activeSource==="youtube"&&(youtubeLoading||youtubeError||youtubeResults.length>0)&&<div className="detail-block youtube-block">
          <div className="trailer-heading"><div><h3>YouTube · Play Inside ZXH</h3><span className="fak-powered">Official YouTube embedded player · no app redirect</span></div></div>
          {youtubeLoading&&<p>Finding embeddable long-form videos…</p>}
          {youtubeError&&<p className="fak-error">{youtubeError}</p>}
          {youtubeResults.map((video,index)=><button className="fak-result" key={video.id+"-"+index} onClick={()=>openPlayer({kind:"youtube",source:"youtube",youtubeId:video.id,title:video.title,poster:video.thumbnail,channel:video.channel,duration:video.duration,description:video.description,youtubeQueue:youtubeResults,youtubeIndex:index})}>
            <img src={video.thumbnail||""} alt="" loading="lazy"/><span><strong>{video.title}</strong><small>{video.channel} · {video.duration||"Duration unavailable"} · YouTube embed</small></span><Play size={17}/>
          </button>)}
          <p className="youtube-note">Only videos that allow embedding can play here. Full-film availability and viewing rights depend on the uploader.</p>
        </div>}
        {activeSource==="archive"&&(archiveLoading||archiveError||archiveResults.length>0)&&<div className="detail-block archive-block">
          <div className="trailer-heading"><div><h3>Free Legal Streaming Sources</h3><span className="fak-powered">Internet Archive · verified license metadata</span></div></div>
          {archiveLoading&&<p>Searching public-domain and Creative Commons videos…</p>}
          {archiveError&&<p className="fak-error">{archiveError}</p>}
          {archiveResults.map((source,index)=><button className="fak-result" key={source.id+"-"+index} onClick={()=>openPlayer({kind:"archive",source:"archive",id:source.id,title:source.title,poster:source.poster,streamUrl:source.url,format:source.format,license:source.license})}>
            <span className="episode-number"><Play size={15}/></span><span><strong>{source.title}</strong><small>{source.format} · {source.license}</small></span><ChevronRight size={18}/>
          </button>)}
        </div>}
        {activeSource==="trailer"&&showTrailer&&trailer&&<div className="detail-block trailer-block"><div className="trailer-heading"><h3>Now Playing · {titleOf(item)} Trailer</h3><button className="glass-btn" onClick={()=>setShowTrailer(false)}><X size={15}/> Close</button></div><div className="trailer-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.key)}?autoplay=1&rel=0&modestbranding=1`} title={`${titleOf(item)} trailer`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div></div>}
        <div className="detail-block"><h3>About this title</h3><p>{item.overview || "No description available."}</p></div>
        {cast.length>0&&<div className="detail-block"><h3>Cast</h3><div className="cast">{cast.map(c=><div className="cast-item" key={c.id}><img src={img(c.profile_path,"w185")} alt={c.name}/><strong>{c.name}</strong><span>{c.character}</span></div>)}</div></div>}
        {rec.length>0&&<div className="detail-block"><h3>You may also like</h3><div className="mini-grid">{rec.map(x=><MovieCard key={x.id} item={{...x,media_type:item.media_type}} openDetails={openDetails}/>)}</div></div>}
      </div>
    </div>
  </div>
}


function YouTubeAutoPlayer({entry}){
  const hostRef=useRef(null);
  const playerRef=useRef(null);
  const indexRef=useRef(Math.max(0,entry.youtubeIndex||0));
  const [activeIndex,setActiveIndex]=useState(indexRef.current);
  const [fallbackMessage,setFallbackMessage]=useState("");
  const queue=Array.isArray(entry.youtubeQueue)&&entry.youtubeQueue.length?entry.youtubeQueue:[{id:entry.youtubeId,title:entry.title,channel:entry.channel,duration:entry.duration}];
  const active=queue[Math.min(activeIndex,queue.length-1)];
  useEffect(()=>{
    let cancelled=false;
    const mount=()=>{
      if(cancelled||!hostRef.current||!window.YT?.Player)return;
      playerRef.current=new window.YT.Player(hostRef.current,{
        videoId:queue[indexRef.current]?.id,
        playerVars:{autoplay:1,rel:0,playsinline:1,origin:window.location.origin},
        events:{
          onError:()=>{
            if(cancelled)return;
            const next=indexRef.current+1;
            if(next<queue.length){
              indexRef.current=next;
              setActiveIndex(next);
              setFallbackMessage("This video is blocked or unavailable. Trying the next playable result…");
              playerRef.current?.loadVideoById(queue[next].id);
            }else{
              setFallbackMessage("All matching YouTube results refused playback. Try another title or source.");
            }
          }
        }
      });
    };
    if(window.YT?.Player) mount();
    else{
      const previous=window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady=()=>{if(typeof previous==="function")previous();mount()};
      if(!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')){
        const script=document.createElement("script");
        script.src="https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }
    }
    return ()=>{cancelled=true;if(playerRef.current){try{playerRef.current.destroy()}catch{}playerRef.current=null}};
  },[]);
  return <div className="youtube-auto-player">
    <div ref={hostRef} className="youtube-iframe-host"/>
    {fallbackMessage&&<p className="youtube-fallback-message" role="status">{fallbackMessage}</p>}
    <div className="youtube-queue-status">Playing result {Math.min(activeIndex+1,queue.length)} of {queue.length}: {active?.title||entry.title}</div>
  </div>;
}

function PlayerScreen({entry,onBack}){
  const detail=entry.detail||{};
  const streams=Array.isArray(detail.streams)?detail.streams.filter(s=>s&&s.url):[];
  const downloads=Array.isArray(detail.downloads)?detail.downloads.filter(d=>d&&d.url):[];
  const poster=detail.poster||entry.poster||"";
  const embedPath="/api/fak/embed/"+entry.kind+"/"+encodeURIComponent(entry.id);
  return <main className="player-page">
    <div className="player-topbar">
      <button className="glass-btn" onClick={onBack}><ArrowLeft size={17}/> Back to discovery</button>
      <span className="fak-powered">ZXH-OFFICIAL • MOVIES PLAYER</span>
    </div>
    <section className="player-heading">
      {poster&&<img src={poster} alt="" loading="lazy"/>}
      <div><span className="eyebrow">{entry.kind==="episode"?"EPISODE PLAYER":"MOVIE PLAYER"}</span><h1>{entry.title||detail.title||"Now Playing"}</h1><p>{detail.description||detail.overview||"Playback powered by the authorized Movies API integration."}</p></div>
    </section>
    <section className="player-shell">
      {entry.source==="archive" ? <video className="archive-video" controls autoPlay playsInline poster={poster||undefined}><source src={entry.streamUrl} type={entry.format==="MPEG4"?"video/mp4":entry.format==="WebM"?"video/webm":undefined}/>Your browser cannot play this video format.</video> : entry.source==="youtube" ? <YouTubeAutoPlayer key={entry.youtubeId} entry={entry}/> : <iframe src={embedPath} title={entry.title||"ZXH OFFICIAL Player"} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen loading="eager"/>}
    </section>
    {entry.source==="youtube"&&<div className="player-info-row"><div><strong>Source</strong><span>YouTube embedded player · automatic fallback enabled</span></div><div><strong>Channel</strong><span>{entry.channel||"YouTube creator"}</span></div><div><strong>Duration</strong><span>{entry.duration||"Not provided"}</span></div></div>}
    {entry.source==="archive"&&<div className="player-info-row"><div><strong>Source</strong><span>Internet Archive</span></div><div><strong>Rights</strong><span>{entry.license||"See source item license"}</span></div><div><strong>Format</strong><span>{entry.format||"Browser video"}</span></div></div>}
    <div className="player-info-row">
      <div><strong>Available servers</strong><span>{streams.length?streams.length+" server option(s) supplied by the API":"Server switching is provided by the embedded player."}</span></div>
      <div><strong>Downloads</strong><span>{downloads.length?downloads.length+" option(s) supplied by the API":"No separate download options returned."}</span></div>
    </div>
    {streams.length>0&&<section className="player-data-block"><h2>API stream data</h2><div className="player-stream-list">{streams.map((s,i)=><div className="player-stream" key={s.url||i}><span>{s.name||"Server "+(i+1)}</span><small>{s.kind||"Stream"}{s.playable===false?" · unavailable":" · API listed"}</small></div>)}</div></section>}
    {downloads.length>0&&<section className="player-data-block"><h2>Available downloads</h2><div className="player-download-list">{downloads.map((d,i)=><a key={d.url||i} href={d.url} target="_blank" rel="noreferrer">{d.label||"Download "+(i+1)} <ChevronRight size={15}/></a>)}</div></section>}
    <p className="player-credit">ZXH-OFFICIAL · ZULQARNAIN X HAIDER</p>
  </main>;
}

function MobileNav({page,go}){
 return <nav className="mobile-nav glass">{navItems.slice(0,4).map(([label,Icon,key])=><button className={page===key?"active":""} key={key} onClick={()=>go(key)}><Icon size={19}/><span>{label}</span></button>)}</nav>
}
function Footer(){
 return <footer><div className="footer-brand"><span className="brand-mark">Z</span><div><strong>ZXH MOVIES</strong><small>3D LIQUID GLASS CINEMA</small></div></div><p>Movie and TV metadata powered by TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</p><span>© {new Date().getFullYear()} ZXH OFFICIAL</span></footer>
}
createRoot(document.getElementById("root")).render(<App/>);