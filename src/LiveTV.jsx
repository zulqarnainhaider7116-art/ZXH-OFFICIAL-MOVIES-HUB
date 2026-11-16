import React,{useEffect,useMemo,useRef,useState} from "react";
import Hls from "hls.js";
import {Radio,Search,Play,Globe2,Signal,ExternalLink,X,Maximize2,ChevronDown} from "lucide-react";

const API="https://iptv-org.github.io/api";
let catalogCache=null;
let catalogPromise=null;
async function loadCatalog(){
  if(catalogCache)return catalogCache;
  if(!catalogPromise)catalogPromise=Promise.all([
    fetch(API+"/countries.json").then(r=>{if(!r.ok)throw new Error("Countries catalog unavailable");return r.json()}),
    fetch(API+"/channels.json").then(r=>{if(!r.ok)throw new Error("Channels catalog unavailable");return r.json()}),
    fetch(API+"/streams.json").then(r=>{if(!r.ok)throw new Error("Streams catalog unavailable");return r.json()}),
    fetch(API+"/logos.json").then(r=>r.ok?r.json():[])
  ]).then(([countries,channels,streams,logos])=>{
    catalogCache={countries,channels,streams,logos};return catalogCache;
  }).finally(()=>{catalogPromise=null});
  return catalogPromise;
}
export default function LiveTV(){
  const [catalog,setCatalog]=useState(catalogCache);
  const [loading,setLoading]=useState(!catalogCache);
  const [error,setError]=useState("");
  const [country,setCountry]=useState("PK");
  const [category,setCategory]=useState("all");
  const [query,setQuery]=useState("");
  const [active,setActive]=useState(null);
  const videoRef=useRef(null);
  const hlsRef=useRef(null);
  useEffect(()=>{let alive=true;loadCatalog().then(data=>{if(alive)setCatalog(data)}).catch(e=>{if(alive)setError(e.message||"Live TV catalog could not load.")}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[]);
  const countries=useMemo(()=>catalog?.countries?.slice().sort((a,b)=>a.name.localeCompare(b.name))||[],[catalog]);
  const logoMap=useMemo(()=>{const map=new Map();(catalog?.logos||[]).filter(x=>x.in_use!==false).forEach(x=>{if(x.channel&&!map.has(x.channel))map.set(x.channel,x.url)});return map},[catalog]);
  const channelRows=useMemo(()=>{
    if(!catalog)return [];
    const streamsByChannel=new Map();
    for(const stream of catalog.streams||[]){
      if(!stream.channel||!stream.url||!/^https:\/\//i.test(stream.url)||stream.referrer||stream.user_agent)continue;
      if((stream.labels||[]).some(x=>/geo-blocked|not 24\/7/i.test(x)))continue;
      if(!/\.m3u8(?:$|[?#])/i.test(stream.url))continue;
      const list=streamsByChannel.get(stream.channel)||[];list.push(stream);streamsByChannel.set(stream.channel,list);
    }
    return (catalog.channels||[]).filter(ch=>ch.country===country&&ch.is_nsfw!==true&&!ch.closed&&streamsByChannel.has(ch.id)).map(ch=>({...ch,logo:logoMap.get(ch.id)||"",streams:streamsByChannel.get(ch.id)}));
  },[catalog,country,logoMap]);
  const categories=useMemo(()=>["all",...new Set(channelRows.flatMap(x=>x.categories||[]))].sort((a,b)=>a==="all"?-1:a.localeCompare(b)),[channelRows]);
  const filtered=useMemo(()=>channelRows.filter(ch=>{
    const matchCategory=category==="all"||(ch.categories||[]).includes(category);
    const text=(ch.name+" "+(ch.alt_names||[]).join(" ")+" "+(ch.network||"")).toLowerCase();
    return matchCategory&&text.includes(query.toLowerCase().trim());
  }),[channelRows,category,query]);
  useEffect(()=>{
    const video=videoRef.current;
    if(!video||!active)return;
    const url=active.streams?.[0]?.url;
    if(!url)return;
    if(hlsRef.current){hlsRef.current.destroy();hlsRef.current=null}
    video.pause();video.removeAttribute("src");video.load();
    if(video.canPlayType("application/vnd.apple.mpegurl")){video.src=url;video.play().catch(()=>{})}
    else if(Hls.isSupported()){
      const hls=new Hls({enableWorker:true,lowLatencyMode:true});hlsRef.current=hls;
      hls.loadSource(url);hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED,()=>video.play().catch(()=>{}));
    }else setError("HLS playback is not supported by this browser.");
    return()=>{if(hlsRef.current){hlsRef.current.destroy();hlsRef.current=null}};
  },[active]);
  const closePlayer=()=>{if(hlsRef.current){hlsRef.current.destroy();hlsRef.current=null}if(videoRef.current){videoRef.current.pause();videoRef.current.removeAttribute("src");videoRef.current.load()}setActive(null)};
  const countryName=countries.find(x=>x.code===country)?.name||"Pakistan";
  return <main className="live-page">
    <section className="live-hero">
      <div className="live-hero-copy"><span className="live-kicker"><Signal size={14}/> ZXH GLOBAL BROADCAST</span><h1>Live TV <em>Worldwide.</em></h1><p>Explore publicly listed television channels by country, language and category — all in one place.</p><div className="live-stats"><span><Globe2 size={16}/>{countries.length||"—"} countries</span><span><Radio size={16}/>{filtered.length.toLocaleString()} playable listings</span></div></div>
      <div className="live-orbit"><div className="orbit-ring"/><div className="orbit-core"><Radio size={42}/><span>LIVE</span></div><i>●</i><b>●</b></div>
    </section>
    {error&&<div className="live-alert"><span>{error}</span><button onClick={()=>setError("")}><X size={16}/></button></div>}
    <section className="live-toolbar">
      <div className="live-heading"><div><span className="live-kicker">EXPLORE CHANNELS</span><h2>World television</h2></div><label className="live-country"><Globe2 size={17}/><select value={country} onChange={e=>{setCountry(e.target.value);setCategory("all");setActive(null)}}>{countries.map(c=><option key={c.code} value={c.code}>{c.flag||"🌍"} {c.name}</option>)}</select><ChevronDown size={15}/></label></div>
      <div className="live-filters"><label className="live-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={"Search "+countryName+" channels…"}/></label><div className="live-categories">{categories.map(c=><button key={c} className={category===c?"selected":""} onClick={()=>setCategory(c)}>{c==="all"?"All":c.replace(/-/g," ")}</button>)}</div></div>
    </section>
    {loading?<div className="live-loading"><span className="live-spinner"/><p>Loading worldwide channel directory…</p></div>:<section className="live-channel-section">
      <div className="live-results-head"><strong>{countryName}</strong><span>{filtered.length.toLocaleString()} channels with HTTPS HLS listings</span></div>
      {filtered.length?<div className="live-grid">{filtered.map(ch=><button className={"live-card"+(active?.id===ch.id?" active":"")} key={ch.id} onClick={()=>setActive(ch)}><span className="live-logo">{ch.logo?<img src={ch.logo} alt="" loading="lazy"/>:<b>{ch.name.slice(0,2).toUpperCase()}</b>}</span><span className="live-card-copy"><strong>{ch.name}</strong><small>{ch.network||ch.categories?.[0]||"Television"} · {ch.streams.length} stream{ch.streams.length===1?"":"s"}</small></span><span className="live-dot"/></button>)}</div>:<div className="live-empty"><Radio size={30}/><strong>No matching live channels</strong><span>Try another category or country. Some broadcasts may be geo-restricted or temporarily offline.</span></div>}
    </section>}
    <p className="live-disclaimer">Channel metadata and stream links are sourced from the community-maintained IPTV-org public directory. Links are third-party, may stop working or be geo-restricted, and are not guaranteed to be licensed or available in every region. Channel owners retain control of their broadcasts. <a href="https://github.com/iptv-org/iptv" target="_blank" rel="noreferrer">Source & removal information <ExternalLink size={12}/></a></p>
    {active&&<div className="live-player-backdrop" onMouseDown={e=>e.target===e.currentTarget&&closePlayer()}><section className="live-player-modal"><header><div className="live-player-brand"><span className="live-logo">{active.logo?<img src={active.logo} alt=""/>:<b>{active.name.slice(0,2).toUpperCase()}</b>}</span><div><strong>{active.name}</strong><small>{countryName} · LIVE TV</small></div></div><button className="live-close" onClick={closePlayer}><X/></button></header><div className="live-video-wrap"><video ref={videoRef} controls autoPlay playsInline controlsList="nodownload" onError={()=>setError("This channel stream is unavailable, blocked, or offline. Try another channel.")}/></div><div className="live-player-footer"><span><i/> LIVE BROADCAST</span>{active.website&&<a href={active.website} target="_blank" rel="noreferrer">Official website <ExternalLink size={13}/></a>}</div>{active.streams.length>1&&<div className="live-stream-options"><strong>Available feeds</strong>{active.streams.map((s,i)=><button key={s.url} onClick={()=>setActive({...active,streams:[s,...active.streams.filter((_,j)=>j!==i)]})}>{s.title||"Feed "+(i+1)} · {s.quality||"HLS"}</button>)}</div>}</section></div>}
  </main>;
}
