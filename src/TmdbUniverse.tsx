// @ts-nocheck
import React,{useEffect,useRef,useState} from "react";

/* Extra discovery rows load only as the visitor approaches them. */
export default function TmdbUniverse({api,setRows,MovieRow,openDetails}){
 const [groups,setGroups]=useState([]);
 const [loading,setLoading]=useState(false);
 const sentinelRef=useRef(null);
 useEffect(()=>{
  let alive=true;
  let started=false;
  const defs=[
   ["Trending Movies",()=>api("/trending/movie/week"),"Trending This Week"],
   ["Trending TV Shows",()=>api("/trending/tv/week"),"Trending This Week"],
   ["Now Playing in Cinemas",()=>api("/movie/now_playing",{region:"PK"}),"Now Playing"],
   ["Top Rated TV Series",()=>api("/tv/top_rated"),"Top Rated"],
   ["Airing Today",()=>api("/tv/airing_today"),"On Air"],
   ["Upcoming Movies",()=>api("/movie/upcoming",{region:"PK"})],
   ["Action & Adventure",()=>api("/discover/movie",{with_genres:"28,12",sort_by:"popularity.desc"})],
   ["Comedy Movies",()=>api("/discover/movie",{with_genres:"35",sort_by:"popularity.desc"})],
   ["Horror Movies",()=>api("/discover/movie",{with_genres:"27",sort_by:"popularity.desc"})],
   ["Romance Movies",()=>api("/discover/movie",{with_genres:"10749",sort_by:"popularity.desc"})],
   ["Science Fiction",()=>api("/discover/movie",{with_genres:"878",sort_by:"popularity.desc"})],
   ["Documentary Movies",()=>api("/discover/movie",{with_genres:"99",sort_by:"popularity.desc"})],
   ["Anime Series",()=>api("/discover/tv",{with_genres:"16",with_original_language:"ja",sort_by:"popularity.desc"})],
   ["Korean Series",()=>api("/discover/tv",{with_original_language:"ko",sort_by:"popularity.desc"})],
   ["Turkish Series",()=>api("/discover/tv",{with_original_language:"tr",sort_by:"popularity.desc"})],
   ["Popular Pakistani Movies",()=>api("/discover/movie",{with_origin_country:"PK",sort_by:"popularity.desc"})]
  ];
  const run=async()=>{
   if(started)return;
   started=true;
   setLoading(true);
   const results=new Array(defs.length);
   let cursor=0;
   const worker=async()=>{
    while(alive){
     const index=cursor++;
     if(index>=defs.length)return;
     const [label,load,target]=defs[index];
     try{
      const data=await load();
      results[index]={status:"fulfilled",value:{label,target,items:(data.results||[]).filter(x=>x.poster_path).map(x=>({...x,media_type:x.media_type||(x.first_air_date?"tv":"movie")}))}};
     }catch(error){results[index]={status:"rejected",reason:error};}
    }
   };
   await Promise.all(Array.from({length:Math.min(4,defs.length)},worker));
   if(!alive)return;
   const fulfilled=results.filter(x=>x?.status==="fulfilled").map(x=>x.value).filter(x=>x.items.length);
   const merged={};
   const additions=[];
   for(const group of fulfilled){
    if(group.target)(merged[group.target]??=[]).push(...group.items);
    else additions.push(group);
   }
   if(Object.keys(merged).length){
    setRows(previous=>{
     const next={...previous};
     for(const [name,incoming] of Object.entries(merged)){
      const existing=next[name]||[];
      const seen=new Set(existing.map(item=>String(item.id)+":"+(item.media_type||(item.first_air_date?"tv":"movie"))));
      next[name]=[...existing,...incoming.filter(item=>{
       const key=String(item.id)+":"+(item.media_type||(item.first_air_date?"tv":"movie"));
       if(seen.has(key))return false;
       seen.add(key);return true;
      })];
     }
     return next;
    });
   }
   setGroups(additions);
   setLoading(false);
  };
  const node=sentinelRef.current;
  if(!node){run();return()=>{alive=false;};}
  if(!("IntersectionObserver" in window)){run();return()=>{alive=false;};}
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();run();}
  },{rootMargin:"900px 0px"});
  observer.observe(node);
  return()=>{alive=false;observer.disconnect();};
 },[api,setRows]);
 return <section ref={sentinelRef} className="universe-loader" aria-live="polite">
  {loading&&<p className="country-loading">Loading more collections…</p>}
  {groups.map(group=><MovieRow key={group.label} title={group.label} items={group.items} openDetails={openDetails}/>)}
 </section>;
}
