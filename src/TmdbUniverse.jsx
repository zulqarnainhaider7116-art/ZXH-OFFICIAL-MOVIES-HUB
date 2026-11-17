import React,{useEffect,useMemo,useState} from "react";
import {Search,ChevronRight,ChevronLeft,Sparkles,Film,Tv,Users,Layers,Building2,Globe2,Tags,Play,Star,MapPin} from "lucide-react";
import "./tmdb-universe.css";

const TABS=[
  ["Overview","overview",Sparkles],["Movies","movies",Film],["TV Shows","tv",Tv],
  ["People","people",Users],["Franchises","collections",Layers],["Studios","companies",Building2],
  ["Networks","networks",Globe2],["Genres","genres",Tags],["Watch Providers","providers",Play]
];
const REGIONS=[["PK","Pakistan"],["US","United States"],["GB","United Kingdom"],["IN","India"],["TR","Turkey"],["KR","South Korea"],["JP","Japan"],["AE","UAE"],["CA","Canada"],["AU","Australia"]];
const unique=(items)=>{const seen=new Set();return (items||[]).filter(x=>x&&x.id&&!seen.has(x.id)&&seen.add(x.id));};
export default function TmdbUniverse({api,img,titleOf,scoreOf,yearOf,openDetails}){
 const [tab,setTab]=useState("overview"),[rows,setRows]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState("");
 const [page,setPage]=useState(1),[query,setQuery]=useState(""),[submitted,setSubmitted]=useState(""),[region,setRegion]=useState("PK"),[media,setMedia]=useState("movie");
 const [genres,setGenres]=useState([]);
 const load=async(nextTab=tab,nextPage=1,searchTerm=submitted)=>{
  setLoading(true);setError("");setRows([]);setPage(nextPage);
  try{
   let groups=[];
   const add=async(label,path,params={})=>{const d=await api(path,{...params,page:nextPage});groups.push({label,items:d.results||[]});};
   if(nextTab==="overview"){
    const defs=[["Trending All","/trending/all/week"],["Popular Movies","/movie/popular"],["Top Rated Movies","/movie/top_rated"],["Now Playing","/movie/now_playing"],["Upcoming Movies","/movie/upcoming"],["Popular TV Shows","/tv/popular"],["Top Rated TV","/tv/top_rated"],["Airing Today","/tv/airing_today"],["On The Air","/tv/on_the_air"],["Popular People","/person/popular"]];
    groups=await Promise.all(defs.map(async([label,path])=>({label,items:(await api(path,{page:nextPage})).results||[]})));
   }else if(nextTab==="movies"){
    const defs=[["Trending Movies","/trending/movie/week"],["Popular Movies","/movie/popular"],["Now Playing","/movie/now_playing"],["Upcoming Movies","/movie/upcoming"],["Top Rated Movies","/movie/top_rated"],["Action & Adventure","/discover/movie",{with_genres:"28,12"}],["Comedy","/discover/movie",{with_genres:"35"}],["Horror","/discover/movie",{with_genres:"27"}],["Romance","/discover/movie",{with_genres:"10749"}],["Science Fiction","/discover/movie",{with_genres:"878"}],["Documentary","/discover/movie",{with_genres:"99"}]];
    groups=await Promise.all(defs.map(async([label,path,params={}])=>({label,items:(await api(path,{...params,page:nextPage,sort_by:"popularity.desc"})).results||[]})));
   }else if(nextTab==="tv"){
    const defs=[["Trending TV","/trending/tv/week"],["Popular Series","/tv/popular"],["Top Rated Series","/tv/top_rated"],["Airing Today","/tv/airing_today"],["Currently On Air","/tv/on_the_air"],["Animation","/discover/tv",{with_genres:"16"}],["Drama","/discover/tv",{with_genres:"18"}],["Crime","/discover/tv",{with_genres:"80"}],["Sci-Fi & Fantasy","/discover/tv",{with_genres:"10765"}],["Documentary","/discover/tv",{with_genres:"99"}]];
    groups=await Promise.all(defs.map(async([label,path,params={}])=>({label,items:(await api(path,{...params,page:nextPage,sort_by:"popularity.desc"})).results||[]})));
   }else if(nextTab==="people"){
    groups=await Promise.all([["Popular People","/person/popular"],["Trending People","/trending/person/week"]].map(async([label,path])=>({label,items:(await api(path,{page:nextPage})).results||[]})));
   }else if(nextTab==="collections"){
    const terms=searchTerm?[searchTerm]:["Marvel","DC","Harry Potter","Star Wars","Fast and Furious","The Lord of the Rings"];
    groups=await Promise.all(terms.map(async(term)=>({label:"Franchises matching “"+term+"”",items:(await api("/search/collection",{query:term,page:nextPage,include_adult:"false"})).results||[]})));
   }else if(nextTab==="companies"||nextTab==="networks"){
    const terms=searchTerm?[searchTerm]:(nextTab==="companies"?["Warner Bros","Universal Pictures","Sony Pictures","Walt Disney Pictures","Netflix"]:["Netflix","HBO","Disney Plus","Apple TV Plus","Amazon"]);
    groups=await Promise.all(terms.map(async(term)=>({label:"Results for “"+term+"”",items:(await api(nextTab==="companies"?"/search/company":"/search/company",{query:term,page:nextPage})).results||[]})));
   }else if(nextTab==="genres"){
    const [m,t]=await Promise.all([api("/genre/movie/list"),api("/genre/tv/list")]);
    setGenres([{label:"Movie Genres",items:m.genres||[],type:"movie"},{label:"TV Genres",items:t.genres||[],type:"tv"}]);
    groups=[];
   }else if(nextTab==="providers"){
    groups=await Promise.all(["movie","tv"].map(async(type)=>({label:(type==="movie"?"Movie":"TV")+" Streaming Providers · "+region,items:(await api("/watch/providers/"+type,{watch_region:region,language:"en-US"})).results||[]})));
   }
   setRows(groups.map(g=>({...g,items:unique(g.items).map(x=>({...x,media_type:x.media_type||(x.first_air_date?"tv":x.release_date?"movie":undefined)}))})));
  }catch(e){setError(e.message||"TMDB collections could not be loaded.");}
  finally{setLoading(false);}
 };
 useEffect(()=>{load("overview",1,"");},[]);
 const runSearch=e=>{e?.preventDefault();setSubmitted(query.trim());load(tab,1,query.trim());};
 const heading=useMemo(()=>TABS.find(x=>x[1]===tab)?.[0]||"TMDB Universe",[tab]);
 return <section className="tmdb-universe">
  <div className="universe-hero"><div><span className="universe-kicker"><Sparkles size={13}/> COMPLETE DISCOVERY</span><h2>Explore the <em>TMDB Universe.</em></h2><p>One library for cinematic titles, talent, franchises and streaming discovery.</p></div><div className="universe-count"><strong>TMDB</strong><span>LIVE DATA</span></div></div>
  <div className="universe-tabs" role="tablist" aria-label="TMDB data collections">{TABS.map(([label,key,Icon])=><button key={key} role="tab" aria-selected={tab===key} className={tab===key?"active":""} onClick={()=>{setTab(key);setSubmitted("");setQuery("");load(key,1,"");}}><Icon size={15}/>{label}</button>)}</div>
  <div className="universe-toolbar"><div><span className="eyebrow">BROWSE COLLECTIONS</span><h2>{heading}</h2></div>
   {tab==="providers"&&<label className="universe-region"><MapPin size={15}/><select value={region} onChange={e=>{setRegion(e.target.value);load(tab,1,submitted);}}>{REGIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>}
   {["collections","companies","networks"].includes(tab)&&<form className="universe-search" onSubmit={runSearch}><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={"Search "+heading.toLowerCase()+"…"}/><button type="submit">Search</button></form>}
  </div>
  {loading&&<div className="universe-state"><span className="universe-spinner"/><strong>Loading live TMDB data…</strong></div>}
  {error&&<div className="universe-error">{error}<button onClick={()=>load(tab,page,submitted)}>Retry</button></div>}
  {tab==="genres"&&genres.map(group=><div className="universe-genre-group" key={group.type}><h3>{group.label}</h3><div className="universe-genre-grid">{group.items.map(g=><button key={g.id} onClick={async()=>{setLoading(true);try{const d=await api("/discover/"+group.type,{with_genres:String(g.id),sort_by:"popularity.desc"});setRows([{label:g.name+" "+(group.type==="movie"?"Movies":"TV Shows"),items:unique(d.results).map(x=>({...x,media_type:group.type}))}]);}catch(e){setError(e.message);}finally{setLoading(false);}}}>{g.name}<ChevronRight size={15}/></button>)}</div></div>)}
  {tab==="genres"&&genres.length===0&&!loading&&<div className="universe-state">Preparing genre directory…</div>}
  {rows.map((group,index)=><div className="universe-row" key={group.label+index}><div className="universe-row-head"><h3>{group.label}</h3><span>{group.items.length} results</span></div>
   {group.items.length>0?<div className="universe-grid">{group.items.map((item,i)=>{
    const isPerson=tab==="people",isCollection=tab==="collections",isProvider=tab==="providers",isCompany=["companies","networks"].includes(tab);
    const poster=isPerson?item.profile_path:isCollection?item.poster_path||item.backdrop_path:isProvider?item.logo_path:isCompany?item.logo_path:item.poster_path;
    const name=isPerson?item.name:isCollection?item.name:isProvider?item.provider_name:isCompany?item.name:titleOf(item);
    const subtitle=isPerson?(item.known_for_department||"Cast & Crew"):isCollection?(item.parts?.length?item.parts.length+" titles":"Movie franchise"):isProvider?(item.display_priority!=null?"Streaming · "+region:"Streaming provider"):isCompany?"TMDB studio / network":(yearOf(item)||"—")+" · "+(item.media_type==="tv"?"TV Series":"Movie");
    const click=()=>{if(item.media_type==="movie"||item.media_type==="tv"||item.release_date||item.first_air_date)openDetails({...item,media_type:item.media_type||(item.first_air_date?"tv":"movie")});};
    return <button className="universe-card" key={item.id+"-"+i} onClick={click} disabled={isProvider||isCompany||isCollection||isPerson}><div className="universe-poster">{poster?<img src={img(poster,"w342")} alt={name} loading="lazy"/>:<span>{(name||"?").slice(0,1)}</span>}{!isProvider&&!isCompany&&!isPerson&&<i><Play size={15} fill="currentColor"/></i>}</div><strong>{name||"Untitled"}</strong><small>{subtitle}</small>{!isPerson&&!isProvider&&!isCompany&&!isCollection&&<span className="universe-rating"><Star size={11} fill="currentColor"/> {scoreOf(item)}</span>}</button>;
   })}</div>:<p className="universe-empty">No results in this collection yet.</p>}
  </div>)}
  {!loading&&tab!=="genres"&&rows.length===0&&!error&&<div className="universe-state">No collection data available.</div>}
  <div className="universe-pagination"><button disabled={page<=1||loading} onClick={()=>load(tab,page-1,submitted)}><ChevronLeft size={16}/> Previous</button><span>Page {page}</span><button disabled={loading} onClick={()=>load(tab,page+1,submitted)}>Next <ChevronRight size={16}/></button></div>
  <p className="universe-credit">Data provided by TMDB · ZXH OFFICIAL · Developed by ZULQARNAIN X HAIDER</p>
 </section>;
}
