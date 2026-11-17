import React,{useEffect,useState} from "react";

/* Additional discovery rows are intentionally rendered in the existing homepage style. */
export default function TmdbUniverse({api,MovieRow,openDetails}){
 const [groups,setGroups]=useState([]);
 useEffect(()=>{
  let alive=true;
  const run=async()=>{
   const defs=[
    ["Trending Movies",()=>api("/trending/movie/week")],
    ["Trending TV Shows",()=>api("/trending/tv/week")],
    ["Upcoming Movies",()=>api("/movie/upcoming",{region:"PK"})],
    ["Now Playing in Cinemas",()=>api("/movie/now_playing",{region:"PK"})],
    ["Top Rated TV Series",()=>api("/tv/top_rated")],
    ["Airing Today",()=>api("/tv/airing_today")],
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
   const results=await Promise.allSettled(defs.map(async([label,load])=>{
    const data=await load();
    return {label,items:(data.results||[]).filter(x=>x.poster_path).map(x=>({...x,media_type:x.media_type||(x.first_air_date?"tv":"movie")}))};
   }));
   const next=results.filter(x=>x.status==="fulfilled").map(x=>x.value).filter(x=>x.items.length);
   if(alive)setGroups(next);
  };
  run();
  return ()=>{alive=false;};
 },[api]);
 return <>{groups.map(group=><MovieRow key={group.label} title={group.label} items={group.items} openDetails={openDetails}/>)}</>;
}
