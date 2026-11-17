import React,{useEffect,useState} from "react";

/* TMDB data is merged into matching homepage collections; only missing categories get new rows. */
export default function TmdbUniverse({api,setRows,MovieRow,openDetails}){
 const [groups,setGroups]=useState([]);
 useEffect(()=>{
  let alive=true;
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
   const results=await Promise.allSettled(defs.map(async([label,load,target])=>{
    const data=await load();
    return {label,target,items:(data.results||[]).filter(x=>x.poster_path).map(x=>({...x,media_type:x.media_type||(x.first_air_date?"tv":"movie")}))};
   }));
   if(!alive)return;
   const fulfilled=results.filter(x=>x.status==="fulfilled").map(x=>x.value).filter(x=>x.items.length);
   const merged={};
   const additions=[];
   for(const group of fulfilled){
    if(group.target){(merged[group.target]??=[]).push(...group.items);}
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
  };
  run();
  return ()=>{alive=false;};
 },[api,setRows]);
 return <>{groups.map(group=><MovieRow key={group.label} title={group.label} items={group.items} openDetails={openDetails}/>)}</>;
}
