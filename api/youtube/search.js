const BRAND="ZXH-OFFICIAL";
const SEARCH_API="https://eliteprotech-apis.zone.id/search/ytsearch";
const send=(res,status,body)=>res.status(status).setHeader("Cache-Control","s-maxage=180, stale-while-revalidate=300").json({brand:BRAND,developer:"ZULQARNAIN X HAIDER",...body});

export default async function handler(req,res){
 if(req.method!=="GET")return send(res,405,{error:{code:"method_not_allowed",message:"Use GET."}});
 const q=String(req.query?.q||"").trim().slice(0,120);
 if(q.length<2)return send(res,400,{error:{code:"invalid_query",message:"Provide a title to search."}});
 try{
  const url=new URL(SEARCH_API);
  url.searchParams.set("q",q);
  const response=await fetch(url,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(15000)});
  const payload=await response.json().catch(()=>null);
  if(!response.ok||payload?.success===false){
   return send(res,502,{error:{code:"youtube_search_failed",message:"The video search provider is temporarily unavailable."}});
  }
  const videos=Array.isArray(payload?.results?.videos)?payload.results.videos:[];
  const results=videos.flatMap(video=>{
   const id=String(video?.id||"").trim();
   if(!id)return [];
   const author=video?.author||{};
   return [{
    id,
    title:String(video?.title||"Untitled").slice(0,200),
    description:String(video?.description||"").slice(0,500),
    channel:String(author?.name||"YouTube").slice(0,100),
    channelUrl:String(author?.url||""),
    thumbnail:String(video?.thumbnail||""),
    duration:String(video?.duration||"")
   }];
  });
  return send(res,200,{api:"ZXH YouTube Search",count:results.length,results});
 }catch(error){
  return send(res,502,{error:{code:"youtube_connection_failed",message:"Could not connect to the video search provider."}});
 }
}
