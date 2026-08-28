import React, {useEffect, useMemo, useState} from "react";
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
  const [search,setSearch] = useState("");
  const [query,setQuery] = useState("");
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

  const go = key => { setPage(key); setMobileOpen(false); setSearch(""); setQuery(""); window.scrollTo({top:0,behavior:"smooth"}); };

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
    try{
      setLoading(true); setPage("search");
      const data=await api("/search/multi",{query:q,include_adult:"false"});
      setRows(r=>({...r,"Search Results":data.results?.filter(x=>(x.media_type==="movie"||x.media_type==="tv")&&x.poster_path)||[]}));
      setQuery(q); window.scrollTo({top:0,behavior:"smooth"});
    }catch(e){setError("Search failed.");} finally{setLoading(false);}
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
        {page==="home" && hero && <Hero item={hero} openDetails={openDetails} toggleWatch={toggleWatch} saved={isSaved(hero.id)}/>}
        <main className={page==="home" ? "content home-content":"content"}>
          {page==="search" && <div className="page-head"><div><span className="eyebrow">DISCOVER</span><h1>Results for “{query}”</h1></div><button className="glass-btn" onClick={()=>go("home")}><ArrowLeft size={16}/> Home</button></div>}
          {page==="list" && <PageTitle icon={<Heart/>} title="My List" text="Your saved cinematic picks."/>}
          {page==="history" && <PageTitle icon={<History/>} title="History" text="Recently explored titles."/>}
          {Object.entries(sectionData).map(([name,items])=><MovieRow key={name} title={name} items={items} openDetails={openDetails}/>)}
          {Object.values(sectionData).every(a=>!a?.length) && <Empty page={page}/>}
        </main>
      </>
    }
    <Footer/>
    {selected && <Details item={selected} close={()=>setSelected(null)} toggleWatch={toggleWatch} saved={isSaved(selected.id)} openDetails={openDetails}/>}
    <MobileNav page={page} go={go}/>
  </div>
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

function Details({item,close,toggleWatch,saved,openDetails}){
  const trailer=item.videos?.results?.find(v=>v.site==="YouTube"&&(v.type==="Trailer"||v.type==="Teaser"));
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
            <div className="hero-actions"><button className="primary-btn" onClick={()=>alert("Connect your authorized video provider in the player layer.")}><Play size={17} fill="currentColor"/> Play</button><button className="glass-btn" onClick={()=>toggleWatch(item)}>{saved?<Check/>:<Plus/>}{saved?" In My List":" Add to List"}</button>{trailer&&<a className="glass-btn" href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noreferrer"><Play size={16}/> Trailer</a>}</div>
            <div className="genres">{item.genres?.map(g=><span key={g.id}>{g.name}</span>)}</div>
          </div>
        </div>
      </div>
      <div className="details-body">
        <div className="detail-block"><h3>About this title</h3><p>{item.overview || "No description available."}</p></div>
        {cast.length>0&&<div className="detail-block"><h3>Cast</h3><div className="cast">{cast.map(c=><div className="cast-item" key={c.id}><img src={img(c.profile_path,"w185")} alt={c.name}/><strong>{c.name}</strong><span>{c.character}</span></div>)}</div></div>}
        {rec.length>0&&<div className="detail-block"><h3>You may also like</h3><div className="mini-grid">{rec.map(x=><MovieCard key={x.id} item={{...x,media_type:item.media_type}} openDetails={openDetails}/>)}</div></div>}
      </div>
    </div>
  </div>
}

function MobileNav({page,go}){
 return <nav className="mobile-nav glass">{navItems.slice(0,4).map(([label,Icon,key])=><button className={page===key?"active":""} key={key} onClick={()=>go(key)}><Icon size={19}/><span>{label}</span></button>)}</nav>
}
function Footer(){
 return <footer><div className="footer-brand"><span className="brand-mark">Z</span><div><strong>ZXH MOVIES</strong><small>3D LIQUID GLASS CINEMA</small></div></div><p>Movie and TV metadata powered by TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</p><span>© {new Date().getFullYear()} ZXH OFFICIAL</span></footer>
}
createRoot(document.getElementById("root")).render(<App/>);