import React, {Suspense, useEffect, useMemo, useRef, useState} from "react";
import { createRoot } from "react-dom/client";
import {
  Search, Home, Film, Tv, Heart, Clock3, UserRound, Menu, X, Play, Globe2,
  Plus, Check, Star, ChevronRight, ChevronLeft, Info, SlidersHorizontal,
  Sparkles, Bookmark, History, ArrowLeft, AlertCircle, Radio, Sun, Moon
} from "lucide-react";
const LiveTV = React.lazy(() => import("./LiveTV.jsx"));
import "./styles.css";
import "./reference-layout.css";
import TmdbUniverse from "./TmdbUniverse.jsx";

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
  ["Live TV", Radio, "live"], ["My List", Heart, "list"], ["History", Clock3, "history"]
];

function App(){
  const [page,setPage] = useState("home");
  const [theme,setTheme]=useState(()=>{const saved=localStorage.getItem("zxh-theme")||"dark";document.documentElement.dataset.theme=saved;return saved;});
  const toggleTheme=()=>setTheme(current=>{const next=current==="light"?"dark":"light";localStorage.setItem("zxh-theme",next);document.documentElement.dataset.theme=next;return next;});
  useEffect(()=>{document.documentElement.dataset.theme=theme;const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content",theme==="light"?"#f8f0f7":"#0e1513");},[theme]);
  const [mobileOpen,setMobileOpen] = useState(false);
  const [hero,setHero] = useState(null);
  const [heroItems,setHeroItems] = useState([]);
  const [movieHero,setMovieHero] = useState(null);
  const [seriesHero,setSeriesHero] = useState(null);
  const [recentSearches,setRecentSearches] = useState(()=>JSON.parse(localStorage.getItem("zxh-recent-searches")||"[]"));
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
  const [installPromptEvent,setInstallPromptEvent]=useState(null);
  const [showInstallPrompt,setShowInstallPrompt]=useState(false);
  const [installHelpMessage,setInstallHelpMessage]=useState("");

  useEffect(()=>{
    let timer;
    const standalone=window.matchMedia?.("(display-mode: standalone)")?.matches||window.navigator.standalone===true;
    const alreadyInstalled=standalone||localStorage.getItem("pwaInstalled")==="true";
    const dismissed=localStorage.getItem("pwaInstallPromptDismissed_v2")==="true";
    if(!alreadyInstalled&&!dismissed){
      timer=window.setTimeout(()=>setShowInstallPrompt(true),1500);
    }
    const onBeforeInstall=e=>{
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    const onInstalled=()=>{
      localStorage.setItem("pwaInstalled","true");
      setShowInstallPrompt(false);
      setInstallPromptEvent(null);
      setInstallHelpMessage("");
    };
    window.addEventListener("beforeinstallprompt",onBeforeInstall);
    window.addEventListener("appinstalled",onInstalled);
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("/sw.js").catch(()=>{});
    }
    return()=>{
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt",onBeforeInstall);
      window.removeEventListener("appinstalled",onInstalled);
    };
  },[]);
  const dismissInstallPrompt=()=>{
    localStorage.setItem("pwaInstallPromptDismissed_v2","true");
    setShowInstallPrompt(false);
  };
  const installApp=async()=>{
    if(!installPromptEvent){
      const ua=navigator.userAgent||"";
      if(/iphone|ipad|ipod/i.test(ua)){
        setInstallHelpMessage("On iPhone/iPad: tap the Share button, choose “Add to Home Screen”, then tap Add.");
      }else if(/android/i.test(ua)){
        setInstallHelpMessage("Open your browser menu (⋮) and choose “Install app” or “Add to Home screen”.");
      }else{
        setInstallHelpMessage("Use your browser menu and choose “Install ZXH OFFICIAL XURVYNA” or “Install app”.");
      }
      return;
    }
    try{
      installPromptEvent.prompt();
      const choice=await installPromptEvent.userChoice;
      if(choice?.outcome==="accepted")localStorage.setItem("pwaInstalled","true");
      else localStorage.setItem("pwaInstallPromptDismissed_v2","true");
    }catch(error){
      setInstallHelpMessage("Open your browser menu and choose “Install app” or “Add to Home screen”.");
    }
    setShowInstallPrompt(false);
    setInstallPromptEvent(null);
  };
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
        const [trending,popularM,popularTV,topM,nowM,airTV,trendingM,trendingTV] = await Promise.all([
          api("/trending/all/week"),
          api("/movie/popular",{region:"US"}),
          api("/tv/popular"),
          api("/movie/top_rated",{region:"US"}),
          api("/movie/now_playing",{region:"US"}),
          api("/tv/on_the_air"),
          api("/trending/movie/week"),
          api("/trending/tv/week")
        ]);
        const clean=a=>a.results?.filter(x=>x.poster_path) || [];
        const trend=clean(trending);
        setHeroItems(trend.slice(0,5));
        setHero(trend[0]);
        setMovieHero((trendingM.results||[]).find(x=>x.backdrop_path)||popularM.results?.[0]||null);
        setSeriesHero((trendingTV.results||[]).find(x=>x.backdrop_path)||popularTV.results?.[0]||null);
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

  // Keep the featured Hero stable while scrolling; automatic backdrop swapping caused visual flashing.
  useEffect(()=>{
    if(!selected) return;
    document.body.style.overflow="hidden";
    const onKey=e=>e.key==="Escape" && setSelected(null);
    window.addEventListener("keydown",onKey);
    return ()=>{document.body.style.overflow="";window.removeEventListener("keydown",onKey)};
  },[selected]);

  const go = key => { setPage(key); setMobileOpen(false); setSearch(""); setQuery(""); setPlayer(null); if(key!=="category"&&key!=="live")setActiveCategory(""); window.scrollTo({top:0,behavior:"auto"}); };
  const [activeCategory,setActiveCategory]=useState("");
  const [categoryData,setCategoryData]=useState({});
  const [categoryLoading,setCategoryLoading]=useState(false);
  const [categoryError,setCategoryError]=useState("");
  const [catalogType,setCatalogType]=useState("movie");
  const loadAdultCatalog=async(key,type="movie")=>{
    setCategoryLoading(true);setCategoryError("");setCategoryData({});
    try{
      const isTV=type==="tv";
      const params=isTV
        ? {certification_country:"US",certification:"TV-MA",sort_by:"popularity.desc"}
        : {with_genres:"27,53,9648",include_adult:"true",sort_by:"primary_release_date.desc"};
      const pages=await Promise.all([1,2,3].map(page=>api(isTV?"/discover/tv":"/discover/movie",{...params,page,...(!isTV?{ "vote_count.gte":"1" }:{})})));
      const seen=new Set();
      const items=pages.flatMap(data=>data.results||[]).filter(item=>{
        if(!item.id||!item.poster_path||seen.has(item.id))return false;
        seen.add(item.id);
        return true;
      }).map(item=>({...item,media_type:type}));
      setCategoryData({[isTV?"Midnight TV Series":"Midnight Movies"]:items});
    }catch(e){setCategoryError(e.message||"Unable to load Midnight collection.");}
    finally{setCategoryLoading(false);}
  };
  const [countryCode,setCountryCode]=useState("PK");
  const [countryRows,setCountryRows]=useState({});
  const [countryLoading,setCountryLoading]=useState(false);
  const [countryError,setCountryError]=useState("");
  const countryOptions=[["PK","Pakistan"],["US","United States"],["GB","United Kingdom"],["IN","India"],["TR","Turkey"],["KR","South Korea"],["JP","Japan"],["CN","China"],["BD","Bangladesh"],["AE","UAE"],["SA","Saudi Arabia"],["CA","Canada"],["AU","Australia"],["FR","France"],["DE","Germany"],["ES","Spain"],["IT","Italy"],["BR","Brazil"],["MX","Mexico"],["ID","Indonesia"],["TH","Thailand"],["PH","Philippines"],["NG","Nigeria"],["ZA","South Africa"]];
  const loadCountry=async(code=countryCode)=>{
    setCountryCode(code);setPage("country");setMobileOpen(false);setCountryLoading(true);setCountryError("");setCountryRows({});setPlayer(null);window.scrollTo({top:0,behavior:"auto"});
    try{
      const [movies,action,horror,anime,series,actionTV]=await Promise.all([
        api("/discover/movie",{region:code,sort_by:"popularity.desc"}),
        api("/discover/movie",{region:code,with_genres:"28",sort_by:"popularity.desc"}),
        api("/discover/movie",{region:code,with_genres:"27",sort_by:"popularity.desc"}),
        api("/discover/tv",{with_origin_country:code,with_genres:"16",sort_by:"popularity.desc"}),
        api("/discover/tv",{with_origin_country:code,sort_by:"popularity.desc"}),
        api("/discover/tv",{with_origin_country:code,with_genres:"10759",sort_by:"popularity.desc"})
      ]);
      const clean=(d,type)=>(d.results||[]).filter(x=>x.poster_path).map(x=>({...x,media_type:type}));
      setCountryRows({[(countryOptions.find(x=>x[0]===code)?.[1]||code)+" Movies"]:clean(movies,"movie"),"Action Movies":clean(action,"movie"),"Horror Movies":clean(horror,"movie"),"Anime":clean(anime,"tv"),"TV Series":clean(series,"tv"),"Action Series":clean(actionTV,"tv")});
    }catch(e){setCountryError(e.message||"Could not load country collections.");}
    finally{setCountryLoading(false)}
  };
  const chooseCategory=async(key,label)=>{
    setMobileOpen(false);
    if(key==="live"){setActiveCategory(key);go("live");return;}
    if(key==="midnight"){
      setActiveCategory(key);setPage("category");setPlayer(null);
      setCatalogType("movie");
      window.scrollTo({top:0,behavior:"auto"});
      await loadAdultCatalog(key,"movie");
      return;
    }
    setActiveCategory(key);setPage("category");setPlayer(null);setCategoryLoading(true);setCategoryError("");setCategoryData({});
    window.scrollTo({top:0,behavior:"auto"});
    try{
      let path="/discover/movie",params={},type="movie",fixedRows=null;
      if(key==="trending"){fixedRows=[["Trending This Week",()=>api("/trending/all/week")],["Trending Movies",()=>api("/trending/movie/week")],["Trending Series",()=>api("/trending/tv/week")],["Popular Movies",()=>api("/movie/popular")],["Popular Series",()=>api("/tv/popular")]];}
      else if(key==="movies"){fixedRows=[["Trending",()=>api("/trending/movie/week")],["Popular",()=>api("/movie/popular")],["Top Rated",()=>api("/movie/top_rated")],["Now Playing",()=>api("/movie/now_playing")]];}
      else if(key==="series"){type="tv";fixedRows=[["Trending TV Shows & Web Series",()=>api("/trending/tv/week")],["Popular Series",()=>api("/tv/popular")],["Top Rated Series",()=>api("/tv/top_rated")],["Currently Airing",()=>api("/tv/on_the_air")]];}
      else if(key==="anime"){path="/discover/tv";type="tv";params={with_genres:"16",with_original_language:"ja"};}
      else if(key==="bollywood"){params={with_original_language:"hi",region:"IN"};}
      else if(key==="hollywood"){params={with_original_language:"en",region:"US"};}
      else if(key==="pakistani"){params={with_original_language:"ur"};}
      else if(key==="korean"){path="/discover/tv";type="tv";params={with_original_language:"ko"};}
      else if(key==="turkish"){path="/discover/tv";type="tv";params={with_original_language:"tr"};}
      else if(key==="action"||key==="comedy"||key==="horror"){params={with_genres:key==="action"?"28":key==="comedy"?"35":"27"};}
      if(fixedRows){
        const results=await Promise.all(fixedRows.map(async([name,load])=>[name,load()]));
        const resolved=await Promise.all(results.map(async([name,promise])=>[name,await promise]));
          const sections={};
        for(const [name,data] of resolved)sections[name]=(data.results||[]).filter(x=>x.poster_path).map(x=>({...x,media_type:mediaTypeFor(x,type)}));
        setCategoryData(sections);
      }else{
        const [trending,popular,topRated]=await Promise.all([
          api(path,{...params,sort_by:"popularity.desc"}),
          api(path,{...params,sort_by:"vote_count.desc"}),
          api(path,{...params,sort_by:"vote_average.desc","vote_count.gte":50})
        ]);
        const clean=data=>(data.results||[]).filter(x=>x.poster_path).map(x=>({...x,media_type:type}));
        setCategoryData({["Trending in "+label]:clean(trending),["Popular "+label]:clean(popular),["Top Rated "+label]:clean(topRated)});
      }
    }catch(e){setCategoryError(e.message||"Unable to load this category.");}
    finally{setCategoryLoading(false);}
  };

  const openPlayer = entry => { setPlayerBackPage(page === "player" ? playerBackPage : page); setPlayer(entry); setSelected(null); setPage("player"); window.scrollTo({top:0,behavior:"auto"}); };
  const closePlayer = () => { setPlayer(null); setPage(playerBackPage || "home"); window.scrollTo({top:0,behavior:"auto"}); };

  const openDetails=async(item)=>{
    try{
      const type=item.media_type || (item.first_air_date ? "tv":"movie");
      const data=await api(`/${type}/${item.id}`,{append_to_response:"credits,videos,recommendations"});
      setSelected({...data,media_type:type});
      addHistory({...item,media_type:type});
    }catch(e){setError("Could not open this title.");}
  };

  const doSearch=async(e,value)=>{
    e?.preventDefault();
    const q=(value??search).trim(); if(!q) return;
    setRecentSearches(current=>{const next=[q,...current.filter(x=>x.toLowerCase()!==q.toLowerCase())].slice(0,8);localStorage.setItem("zxh-recent-searches",JSON.stringify(next));return next;});
    setLoading(true); setPage("search"); setQuery(q);
    setYoutubeSearchLoading(true); setYoutubeSearchError(""); setYoutubeSearchResults([]);
    window.scrollTo({top:0,behavior:"auto"});
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
    if(page==="category") return categoryData;
    if(page==="country") return countryRows;
    return rows;
  },[page,rows,watchlist,history,activeCategory,categoryData,countryRows]);

  return <div className="app" data-theme={theme}>
    <div className="ambient a1"/><div className="ambient a2"/><div className="grain"/>
    <Header search={search} setSearch={setSearch} submit={doSearch} openSearch={()=>go("search")} open={mobileOpen} setOpen={setMobileOpen} go={go} page={page} activeCategory={activeCategory} chooseCategory={chooseCategory} theme={theme} toggleTheme={toggleTheme} countryCode={countryCode} countryOptions={countryOptions} loadCountry={loadCountry}/>
    {error && <div className="toast"><AlertCircle size={17}/>{error}<button onClick={()=>setError("")}><X size={15}/></button></div>}
    {loading && !hero ? <div className="loading-screen" role="status" aria-live="polite"><div className="loading-mark"><span className="brand-mark">Z</span><span className="loading-progress"><i/></span></div><strong>ZXH OFFICIAL</strong><span>Preparing your cinema experience…</span></div> :
      <>
        {page==="player" && player ? <PlayerScreen entry={player} onBack={closePlayer}/> : page==="live" ? <><Suspense fallback={<div className="loading-screen live-route-loading" role="status" aria-live="polite"><div className="loading-mark"><span className="brand-mark">Z</span><span className="loading-progress"><i/></span></div><strong>ZXH OFFICIAL</strong><span>Opening Live TV…</span></div>}><LiveTV/></Suspense><Footer/></> : <>
        {(page==="home"||page==="movie"||page==="tv") && (page==="home"?hero:page==="movie"?movieHero:seriesHero) && <Hero item={page==="home"?hero:page==="movie"?movieHero:seriesHero} openDetails={openDetails} toggleWatch={toggleWatch} saved={isSaved((page==="home"?hero:page==="movie"?movieHero:seriesHero).id)} onBrowse={go}/>}
        <main className={["home","movie","tv"].includes(page) ? "content home-content":"content"}>
          {page==="search" && (query ? <div className="page-head"><div><span className="eyebrow">DISCOVER</span><h1>Results for “{query}”</h1></div><button className="glass-btn" onClick={()=>go("home")}><ArrowLeft size={16}/> Home</button></div> : <SearchLanding recent={recentSearches} clearRecent={()=>{setRecentSearches([]);localStorage.removeItem("zxh-recent-searches");}} setSearch={setSearch} searchNow={term=>doSearch(null,term)}/> )}
          {page==="list" && <PageTitle icon={<Heart/>} title="My List" text="Your saved cinematic picks."/>}
          {page==="history" && <PageTitle icon={<History/>} title="History" text="Recently explored titles."/>}
          {page==="category" && <div className="page-head category-page-head"><div><span className="eyebrow">ZXH COLLECTION</span><h1>{categoryLabels[activeCategory]||"Trending"}</h1><p>{activeCategory==="midnight"?"Explore late-night movies and TV-MA series, with each title listed only once.":activeCategory==="series"?"Discover trending TV shows, web series, popular seasons and top-rated series.":"Explore separate trending, popular and top-rated picks in this collection."}</p></div></div>}
          {page==="category"&&(activeCategory==="midnight")&&<div className="catalog-filters" aria-label="Midnight catalog filters">
            <div className="catalog-type-switch" role="group" aria-label="Content type">
              <button type="button" className={catalogType==="movie"?"active":""} onClick={()=>{setCatalogType("movie");loadAdultCatalog(activeCategory,"movie");}}>Movies</button>
              <button type="button" className={catalogType==="tv"?"active":""} onClick={()=>{setCatalogType("tv");loadAdultCatalog(activeCategory,"tv");}}>TV Shows &amp; Series</button>
            </div>
          </div>}
          {page==="category"&&categoryLoading&&<p className="country-loading">Building your {categoryLabels[activeCategory]||"category"} collection…</p>}
          {page==="category"&&categoryError&&<p className="fak-error">{categoryError}</p>}
          {page==="country" && <div className="page-head category-page-head"><div><span className="eyebrow">COUNTRY COLLECTION</span><h1>{countryOptions.find(x=>x[0]===countryCode)?.[1]||countryCode}</h1><p>Movies, genres, anime and television from your selected country.</p></div></div>}
          {page==="country"&&countryLoading&&<p className="country-loading">Loading country collections…</p>}
          {page==="country"&&countryError&&<p className="fak-error">{countryError}</p>}
          {Object.entries(sectionData).map(([name,items])=><MovieRow key={name} title={name} items={items} openDetails={openDetails}/>)}\n          {page==="home" && <TmdbUniverse api={api} setRows={setRows} openDetails={openDetails} MovieRow={MovieRow}/>}
          {page==="search"&&<YouTubeSearchRow items={youtubeSearchResults} loading={youtubeSearchLoading} error={youtubeSearchError} openPlayer={openPlayer}/>}
          {Object.values(sectionData).every(a=>!a?.length) && !(page==="search"&&(youtubeSearchLoading||youtubeSearchResults.length)) && !(page==="category"&&categoryLoading) && !(page==="country"&&countryLoading) && page!=="home" && <Empty page={page}/>}
        </main>
        <Footer/>
        </>}
      </>
    }
    {selected && <Details item={selected} close={()=>setSelected(null)} toggleWatch={toggleWatch} saved={isSaved(selected.id)} openDetails={openDetails} openPlayer={openPlayer}/>}
    {page!=="player" && <MobileNav page={page} go={go}/>}
    <div id="installPromptOverlay" className="install-overlay" hidden={!showInstallPrompt} role="dialog" aria-modal="true" aria-labelledby="install-title">
      <div className="install-card">
        <button id="installClose" className="install-close" type="button" onClick={dismissInstallPrompt} aria-label="Close install popup">×</button>
        <img src="/assets/xurvyna-app-icon-512.jpg" alt="ZXH Official Xurvyna" className="install-icon"/>
        <span className="kicker">ZXH / APP EXPERIENCE</span>
        <h2 id="install-title">KEEP ZXH<br/><i>WITH YOU.</i></h2>
        <p>Add ZXH OFFICIAL XURVYNA to your home screen for a clean, app-like experience with faster access.</p>
        {installHelpMessage&&<p className="install-help" role="status">{installHelpMessage}</p>}
        <button id="installBtn" type="button" className="btn dark install-main" onClick={installApp}>INSTALL APP <b>↓</b></button>
        <button id="installLater" type="button" className="install-later" onClick={dismissInstallPrompt}>NOT NOW</button>
      </div>
    </div>
  </div>
}


function mediaTypeFor(x,fallback){return x.media_type||(x.first_air_date?"tv":fallback);}

function SearchLanding({recent,clearRecent,setSearch,searchNow}){
  const trending=["Romance Is a Bonus Book","Love in Disguise","Shine on Me","The Lord of the Rings","Study Group","The Remarried Empress"];
  const pick=value=>{setSearch(value);searchNow(value);};
  return <section className="search-landing">
    <div className="search-landing-head"><span className="eyebrow">DISCOVER SOMETHING NEW</span><h1>Find your next favourite.</h1><p>Search movies, TV shows and series across the ZXH collection.</p></div>
    {recent.length>0&&<div className="search-chip-section"><div className="search-chip-heading"><h2>Recent</h2><button type="button" onClick={clearRecent}>Clear <X size={14}/></button></div><div className="search-chips">{recent.map((term,index)=><button type="button" key={term+index} onClick={()=>pick(term)}>{term}</button>)}</div></div>}
    <div className="search-chip-section"><div className="search-chip-heading"><h2>🔥 Everyone is searching</h2></div><div className="search-chips trending-searches">{trending.map(term=><button type="button" key={term} onClick={()=>pick(term)}>{term}</button>)}</div></div>
    <div className="search-category-tabs"><span>✦</span><button className="active" type="button">Movie</button><button type="button" onClick={()=>pick("popular TV series")}>Series</button><button type="button" onClick={()=>pick("short TV")}>Short TV</button><button type="button" onClick={()=>pick("music")}>Music</button></div>
    <div className="search-discovery-note"><strong>Explore ZXH OFFICIAL</strong><span>Discover movies and series with clean results, no promotional ad cards.</span></div>
  </section>;
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

const categoryItems=[["Trending","trending"],["Movies","movies"],["Series","series"],["Midnight","midnight"],["Anime","anime"],["Bollywood","bollywood"],["Hollywood","hollywood"],["Pakistani","pakistani"],["Korean","korean"],["Turkish","turkish"],["Action","action"],["Comedy","comedy"],["Horror","horror"],["Live TV","live"]];
const categoryLabels=Object.fromEntries(categoryItems.map(([label,key])=>[key,label]));
function Header({search,setSearch,submit,openSearch,open,setOpen,go,page,activeCategory,chooseCategory,theme,toggleTheme,countryCode,countryOptions,loadCountry}){
  return <header className="header glass">
    <div className="header-main">
      <button className="brand" onClick={()=>go("home")} aria-label="ZXH Official OTT home">
        <span className="brand-mark">Z</span><span>ZXH <b>OFFICIAL OTT</b></span>
      </button>
      <nav className="desktop-nav">{navItems.map(([label,Icon,key])=><button className={page===key?"active":""} key={key} onClick={()=>go(key)}><Icon size={16}/>{label}</button>)}</nav>
      <form className="searchbox" onSubmit={submit}><Search size={17}/><input value={search} onFocus={()=>{if(page!=="search")openSearch();}} onChange={e=>setSearch(e.target.value)} placeholder="Search movies & series…"/>{search&&<button type="button" onClick={()=>setSearch("")}><X size={14}/></button>}</form>
      <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={"Switch to "+(theme==="light"?"dark":"light")+" mode"} title={theme==="light"?"Switch to dark mode":"Switch to light mode"}>{theme==="light"?<Moon size={18}/>:<Sun size={18}/>}</button>
      <button type="button" className="menu-btn" aria-label="Open navigation menu" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
    </div>
    <nav className="category-nav" aria-label="Browse categories">{categoryItems.map(([label,key])=><button type="button" key={key} className={activeCategory===key?"active":""} onClick={()=>chooseCategory(key,label)}>{label}</button>)}</nav>
    {open&&<><button className="menu-scrim" aria-label="Close menu" onClick={()=>setOpen(false)}/><aside className="mobile-menu glass"><div className="menu-profile"><span className="profile-avatar"><UserRound size={24}/></span><div><strong>ZXH Guest</strong><small>Guest profile · Local watchlist</small></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close menu"><X size={18}/></button></div><div className="menu-section-label">NAVIGATION</div>{navItems.filter(([,I,k])=>k!=="live").map(([label,Icon,key])=><button type="button" key={key} onClick={()=>go(key)}><Icon size={18}/>{label}</button>)}<div className="menu-section-label">COUNTRY WISE</div><label className="country-picker"><span>Select country</span><select value={countryCode} onChange={e=>loadCountry(e.target.value)}>{countryOptions.map(([code,name])=><option value={code} key={code}>{name}</option>)}</select></label><button type="button" className="country-open-btn" onClick={()=>loadCountry(countryCode)}><Globe2 size={17}/> Explore {countryOptions.find(x=>x[0]===countryCode)?.[1]||countryCode}</button><div className="menu-section-label">BROWSE CATEGORIES</div>{categoryItems.filter(([,key])=>key!=="live").map(([label,key])=><button type="button" key={key} onClick={()=>chooseCategory(key,label)}><Film size={17}/>{label}</button>)}<div className="menu-section-label">LIVE</div><button type="button" onClick={()=>chooseCategory("live","Live TV")}><Radio size={18}/>Live TV</button><small className="menu-credit">ZXH OFFICIAL · ZULQARNAIN X HAIDER</small></aside></>}
  </header>
}

function Hero({item,openDetails,toggleWatch,saved,onBrowse}){
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
      <div className="hero-browse-links" aria-label="Browse movies and TV series">
        <button type="button" onClick={()=>onBrowse("movie")}><Film size={15}/> Movies</button>
        <button type="button" onClick={()=>onBrowse("tv")}><Tv size={15}/> TV Series</button>
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
  const isSeries=item.media_type==="tv"||!!item.first_air_date;
  const seasonCount=Number(item.number_of_seasons||item.seasons?.filter(season=>season.season_number>0).length||0);
  const posterLabel=isSeries?(seasonCount?`${seasonCount} ${seasonCount===1?"SEASON":"SEASONS"}`:"SERIES"):"HD";
  return <button className="movie-card" onClick={()=>openDetails(item)} aria-label={`Open ${titleOf(item)} details`} title={titleOf(item)}>
    <div className="poster">
      <img src={img(item.poster_path,"w500")} alt={titleOf(item)} loading="lazy" decoding="async" onError={event=>{event.currentTarget.hidden=true;}}/>
      <div className="poster-gloss"/>
      <span className="score"><Star size={11} fill="currentColor"/>{scoreOf(item)}</span>
      <span className={`quality${isSeries?" series-quality":""}`}>{posterLabel}</span>
      <span className="card-play"><Play size={18} fill="currentColor"/></span>
    </div>
    <div className="card-info"><strong>{titleOf(item)}</strong><span>{yearOf(item)||"—"} <i/> {isSeries?"TV Show / Web Series":"Movie"}{seasonCount?` · ${seasonCount} ${seasonCount===1?"Season":"Seasons"}`:""}</span></div>
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
    const isSeries=item.media_type==="tv";
    const season=Number(item.seasons?.find(s=>s.season_number>0)?.season_number||1);
    const episode=1;
    let imdbId=item.imdb_id||"";
    try{
      const externalIds=await api(`/${isSeries?"tv":"movie"}/${item.id}/external_ids`);
      imdbId=externalIds.imdb_id||imdbId;
    }catch{}
    const servers=[
      {id:"1",name:"SERVER 1",movie:id=>"https://vidlink.pro/movie/"+id,tv:(id,s,e)=>"https://vidlink.pro/tv/"+id+"/"+s+"/"+e},
      {id:"2",name:"SERVER 2",movie:id=>"https://player.vidzee.wtf/embed/movie/"+id,tv:(id,s,e)=>"https://player.vidzee.wtf/embed/tv/"+id+"/"+s+"/"+e},
      {id:"3",name:"SERVER 3",movie:id=>"https://vidrock.net/embed/movie/"+id,tv:(id,s,e)=>"https://vidrock.net/embed/tv/"+id+"/"+s+"/"+e},
      {id:"4",name:"SERVER 4",movie:id=>"https://vidnest.fun/movie/"+id,tv:(id,s,e)=>"https://vidnest.fun/tv/"+id+"/"+s+"/"+e},
      {id:"5",name:"SERVER 5",movie:id=>"https://cinesrc.st/embed/movie/"+id,tv:(id,s,e)=>"https://cinesrc.st/embed/tv/"+id+"?s="+s+"&e="+e},
      {id:"6",name:"SERVER 6",movie:id=>"https://anyplay.stream/embed/movie/68ca4cf7203ee8afe6ee44cf/"+id,tv:(id,s,e)=>"https://anyplay.stream/embed/movie/68ca4cf7203ee8afe6ee44cf/"+id+"/"+s+"/"+e},
      {id:"7",name:"SERVER 7",dynamic:true,movie:()=>"",tv:()=>""},
      {id:"8",name:"SERVER 8",movie:id=>"https://multiembed.mov/?video_id="+id+"&tmdb=1",tv:(id,s,e)=>"https://multiembed.mov/?video_id="+id+"&tmdb=1&s="+s+"&e="+e},
      {id:"9",name:"SERVER 9",movie:id=>"https://vidsrcme.su/embed/movie/"+id,tv:(id,s,e)=>"https://vidsrcme.su/embed/tv/"+id+"/"+s+"/"+e},
      {id:"10",name:"SERVER 10",movie:id=>imdbId?"https://autoembed.co/movie/imdb/"+imdbId:"",tv:(id,s,e)=>imdbId?"https://autoembed.co/tv/imdb/"+imdbId+"-"+s+"-"+e:""},
      {id:"11",name:"SERVER 11",movie:id=>imdbId?"https://www.2embed.cc/embed/"+imdbId:"",tv:(id,s,e)=>imdbId?"https://www.2embed.cc/embedtv/"+imdbId+"&s="+s+"&e="+e:""}
    ];
    const makeUrl=(server)=>isSeries?server.tv(item.id,season,episode):server.movie(item.id);
    openPlayer({kind:"stream",source:"direct-servers",serverIndex:0,servers,tmdbId:item.id,mediaType:isSeries?"tv":"movie",season,episode,seasons:(item.seasons||[]).filter(x=>Number.isInteger(x.season_number)&&x.season_number>=0).map(x=>({number:x.season_number,name:x.name})),title:titleOf(item),poster:img(item.poster_path,"w780"),description:item.overview||""});
    setAutoWatchLoading(false);
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
            <div className="hero-actions"><button className="primary-btn" onClick={watchNow} disabled={autoWatchLoading}><Play size={17} fill="currentColor"/> {autoWatchLoading?"Starting…":"WATCH"}</button>{trailer&&<button className="glass-btn" onClick={()=>{setActiveSource("trailer");setShowTrailer(true);}}><Play size={16}/> Trailer</button>}<button className="glass-btn" onClick={()=>toggleWatch(item)}>{saved?<Check/>:<Plus/>}{saved?" In My List":" Add to List"}</button></div>{autoWatchError&&<p className="fak-error" role="status">{autoWatchError}</p>}
            <div className="genres">{item.genres?.map(g=><span key={g.id}>{g.name}</span>)}</div>
          </div>
        </div>
      </div>
      <div className="details-body">
        {activeSource==="fak"&&(fakLoading||fakError||fakResults.length>0||fakEpisodes.length>0||fakPlayer)&&<div className="detail-block fak-block">
          <div className="trailer-heading"><div><h3>ZXH OFFICIAL PLAYER</h3><span className="fak-powered">Premium playback experience</span></div>{fakResults.length>0&&<button className="glass-btn" onClick={()=>{setFakResults([]);setFakEpisodes([]);setFakPlayer(null);setFakError("");}}>Reset</button>}</div>
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
  const [activeServerIndex,setActiveServerIndex]=useState(Math.max(0,Number(entry.serverIndex)||0));
  const [selectedSeason,setSelectedSeason]=useState(Number(entry.season||1));
  const [selectedEpisode,setSelectedEpisode]=useState(Number(entry.episode||1));
  const [seasonEpisodes,setSeasonEpisodes]=useState([]);
  const [seasonEpisodesLoading,setSeasonEpisodesLoading]=useState(false);
  const [seasonEpisodesError,setSeasonEpisodesError]=useState("");
  const [server7Data,setServer7Data]=useState(null);
  const [server7Loading,setServer7Loading]=useState(false);
  const [server7Error,setServer7Error]=useState("");
  const [server7SelectedUrl,setServer7SelectedUrl]=useState("");
  useEffect(()=>{
    if(entry.source!=="direct-servers"||entry.mediaType!=="tv")return;
    let cancelled=false;
    setSeasonEpisodesLoading(true);setSeasonEpisodesError("");setSeasonEpisodes([]);
    api(`/tv/${entry.tmdbId}/season/${selectedSeason}`).then(data=>{
      if(cancelled)return;
      const episodes=Array.isArray(data.episodes)?data.episodes:[];
      setSeasonEpisodes(episodes);
      setSelectedEpisode(current=>episodes.some(ep=>ep.episode_number===current)?current:Number(episodes[0]?.episode_number||1));
      if(!episodes.length)setSeasonEpisodesError("No episodes are listed for this season.");
    }).catch(error=>{if(!cancelled)setSeasonEpisodesError(error.message||"Unable to load episodes.");})
      .finally(()=>{if(!cancelled)setSeasonEpisodesLoading(false);});
    return()=>{cancelled=true;};
  },[entry.source,entry.mediaType,entry.tmdbId,selectedSeason]);
  const activeServer=entry.source==="direct-servers"?entry.servers?.[activeServerIndex]:null;
  useEffect(()=>{
    if(activeServer?.id!=="7")return;
    let cancelled=false;
    setServer7Loading(true);setServer7Error("");setServer7Data(null);setServer7SelectedUrl("");
    const params=new URLSearchParams({
      q:entry.title||"Unknown title",
      tmdb:String(entry.tmdbId),
      type:entry.mediaType==="tv"?"tv":"movie",
      season:String(selectedSeason),
      episode:String(selectedEpisode)
    });
    fetch("/api/davidcyril/watch?"+params.toString())
      .then(async response=>{
        const payload=await response.json().catch(()=>null);
        if(!response.ok||!payload?.success||!payload?.result)throw new Error(payload?.error?.message||"SERVER 7 could not find a playable source.");
        return payload.result;
      })
      .then(result=>{
        if(cancelled)return;
        const streams=Object.entries(result.streams||{}).filter(([,url])=>typeof url==="string"&&/^https?:\/\//i.test(url)).map(([name,url])=>({name,url}));
        if(!streams.length)throw new Error("SERVER 7 returned no playable sources for this title.");
        setServer7Data({...result,streams});
        setServer7SelectedUrl(streams[0].url);
      })
      .catch(error=>{if(!cancelled)setServer7Error(error.message||"SERVER 7 is temporarily unavailable.");})
      .finally(()=>{if(!cancelled)setServer7Loading(false);});
    return()=>{cancelled=true;};
  },[activeServer?.id,entry.title,entry.tmdbId,entry.mediaType,selectedSeason,selectedEpisode]);
  const directEmbedUrl=activeServer
    ?(activeServer.dynamic?server7SelectedUrl:(entry.mediaType==="tv"?activeServer.tv(entry.tmdbId,selectedSeason,selectedEpisode):activeServer.movie(entry.tmdbId)))
    :entry.embedUrl;
  const playerShellRef=useRef(null);
  const nativeVideoRef=useRef(null);
  const [isFullscreen,setIsFullscreen]=useState(false);
  const [forceLandscape,setForceLandscape]=useState(false);
  useEffect(()=>{const sync=()=>{const active=!!document.fullscreenElement;setIsFullscreen(active);if(active){try{const orientation=window.screen?.orientation;if(orientation?.lock){Promise.resolve(orientation.lock("landscape")).then(()=>setForceLandscape(false)).catch(()=>setForceLandscape(window.matchMedia("(orientation: portrait)").matches));}else setForceLandscape(window.matchMedia("(orientation: portrait)").matches);}catch{setForceLandscape(window.matchMedia("(orientation: portrait)").matches);}}else{setForceLandscape(false);try{window.screen?.orientation?.unlock?.()}catch{}}};document.addEventListener("fullscreenchange",sync);return()=>document.removeEventListener("fullscreenchange",sync)},[]);
  const togglePlayerFullscreen=async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();return;}const el=playerShellRef.current;if(!el)return;const request=el.requestFullscreen||el.webkitRequestFullscreen;if(!request)throw new Error("Fullscreen is not supported by this browser.");await request.call(el,{navigationUI:"hide"});let locked=false;try{if(window.screen?.orientation?.lock){await window.screen.orientation.lock("landscape");locked=true;}}catch{}setForceLandscape(!locked && window.matchMedia("(orientation: portrait)").matches);}catch(e){console.warn("Fullscreen:",e);setForceLandscape(true)}};
  const streams=Array.isArray(detail.streams)?detail.streams.filter(s=>s&&s.url):[];
  const downloads=Array.isArray(detail.downloads)?detail.downloads.filter(d=>d&&d.url):[];
  const poster=detail.poster||entry.poster||"";
  const embedPath="/api/fak/embed/"+entry.kind+"/"+encodeURIComponent(entry.id);
  return <main className="player-page">
    <div className="player-topbar">
      <div className="player-controls"><button className="glass-btn" onClick={onBack}><ArrowLeft size={17}/> Back to discovery</button><button className="glass-btn" onClick={togglePlayerFullscreen}><span>{isFullscreen?"Exit Fullscreen":"Fullscreen"}</span></button></div>
      <span className="fak-powered">ZXH OFFICIAL PLAYER</span>
    </div>
    {entry.source==="direct-servers"&&<div className={"player-playback-selectors"+(entry.mediaType==="tv"?" is-series":"")} aria-label="Playback selection">
      {entry.mediaType==="tv"&&<>
        <label><span>SEASON SELECT</span><select value={selectedSeason} onChange={event=>setSelectedSeason(Number(event.target.value))}>{(entry.seasons||[]).map(season=><option key={season.number} value={season.number}>Season {season.number}</option>)}</select></label>
        <label><span>EPISODE SELECT</span><select value={selectedEpisode} onChange={event=>setSelectedEpisode(Number(event.target.value))} disabled={seasonEpisodesLoading||!seasonEpisodes.length}>{seasonEpisodes.map(episode=><option key={episode.id||episode.episode_number} value={episode.episode_number}>Episode {episode.episode_number}</option>)}</select></label>
      </>}
      <label><span>SERVER SELECT</span><select value={activeServerIndex} onChange={event=>setActiveServerIndex(Number(event.target.value))}>{entry.servers.map((server,index)=><option key={server.id} value={index}>{server.name}</option>)}</select></label>
      {seasonEpisodesLoading&&<small>Loading episodes…</small>}
      {seasonEpisodesError&&<small className="series-picker-error">{seasonEpisodesError}</small>}
    </div>}
    <section className="player-heading">
      {poster&&<img src={poster} alt="" loading="lazy"/>}
      <div><span className="eyebrow">{entry.kind==="episode"?"EPISODE PLAYER":"MOVIE PLAYER"}</span><h1>{entry.title||detail.title||"Now Playing"}</h1><p>{detail.description||detail.overview||"Enjoy your selection in the ZXH OFFICIAL player."}</p></div>
    </section>
    <section className={"player-shell"+(forceLandscape?" force-landscape":"")} ref={playerShellRef}>
      {entry.source==="archive" ? <video ref={nativeVideoRef} className="archive-video" controls autoPlay playsInline poster={poster||undefined}><source src={entry.streamUrl} type={entry.format==="MPEG4"?"video/mp4":entry.format==="WebM"?"video/webm":undefined}/>Your browser cannot play this video format.</video> : entry.source==="youtube" ? <YouTubeAutoPlayer key={entry.youtubeId} entry={entry}/> : activeServer?.id==="7" ? (server7Loading?<div className="server7-status">Connecting to SERVER 7…</div>:server7Error?<div className="server7-status server7-error">{server7Error}</div>:server7SelectedUrl?<iframe key={server7SelectedUrl} src={server7SelectedUrl} title={entry.title||"ZXH OFFICIAL SERVER 7"} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen loading="eager" referrerPolicy="strict-origin-when-cross-origin"/>:<div className="server7-status">Choose an available source below.</div>) : <iframe key={entry.source==="direct-servers"?directEmbedUrl:embedPath} src={entry.source==="direct-servers"?directEmbedUrl:embedPath} title={entry.title||"ZXH OFFICIAL Player"} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen loading="eager" referrerPolicy="strict-origin-when-cross-origin"/>}
    </section>
    {entry.source==="direct-servers"&&activeServer?.id==="7"&&server7Data?.streams?.length>0&&<section className="server7-source-panel"><div className="server7-panel-heading"><strong>AVAILABLE SERVERS</strong><span>{server7Data.streams.length} server(s)</span></div><div className="server7-source-list">{server7Data.streams.map((source,index)=><button type="button" key={source.name||source.url} className={server7SelectedUrl===source.url?"active":""} onClick={()=>setServer7SelectedUrl(source.url)}>SERVER 7.{index+1}<small>{server7SelectedUrl===source.url?"PLAYING":"PLAY"}</small></button>)}</div></section>}
    {entry.source==="direct-servers"&&activeServer?.id==="7"&&server7Data?.download&&<section className="server7-download-panel"><strong>DOWNLOAD SOURCE</strong><span>{server7Data.download.title||entry.title}</span><div>{server7Data.download.download_url&&<a href={server7Data.download.download_url} target="_blank" rel="noreferrer">DOWNLOAD FILE <ChevronRight size={15}/></a>}{server7Data.download.download_page&&<a href={server7Data.download.download_page} target="_blank" rel="noreferrer">DOWNLOAD PAGE <ChevronRight size={15}/></a>}{server7Data.download.page&&<a href={server7Data.download.page} target="_blank" rel="noreferrer">SOURCE DETAILS <ChevronRight size={15}/></a>}</div></section>}
    {entry.source==="youtube"&&<p className="youtube-note">Now playing inside ZXH OFFICIAL.</p>}
    {entry.source!=="youtube"&&entry.source!=="archive"&&<div className="player-info-row">
      <div><strong>Available servers</strong><span>{streams.length?streams.length+" playback option(s)":"More options may be available inside the player."}</span></div>
      <div><strong>Downloads</strong><span>{downloads.length?downloads.length+" options":"No separate downloads available."}</span></div>
    </div>}
    
    {downloads.length>0&&<section className="player-data-block"><h2>Available downloads</h2><div className="player-download-list">{downloads.map((d,i)=><a key={d.url||i} href={d.url} target="_blank" rel="noreferrer">{d.label||"Download "+(i+1)} <ChevronRight size={15}/></a>)}</div></section>}
    <p className="player-credit">ZXH-OFFICIAL · ZULQARNAIN X HAIDER</p>
  </main>;
}

function MobileNav({page,go}){
 return <nav className="mobile-nav glass">{navItems.filter(([,Icon,key])=>["home","movie","tv","live"].includes(key)).map(([label,Icon,key])=><button className={page===key?"active":""} key={key} onClick={()=>go(key)}><Icon size={19}/><span>{label}</span></button>)}</nav>
}
function Footer(){
 return <footer><div className="footer-brand"><span className="brand-mark">Z</span><div><strong>ZXH OFFICIAL OTT</strong><small>GLOBAL MOVIES · SERIES · LIVE TV</small></div></div><p>Movies and TV discovery powered by TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB. Live channel listings are supplied by IPTV-org.</p><span>© {new Date().getFullYear()} ZXH OFFICIAL</span></footer>
}
createRoot(document.getElementById("root")).render(<App/>);