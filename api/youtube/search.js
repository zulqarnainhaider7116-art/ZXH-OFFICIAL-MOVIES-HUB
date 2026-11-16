const BRAND="ZXH-OFFICIAL";
const send=(res,status,body)=>res.status(status).setHeader("Cache-Control","s-maxage=180, stale-while-revalidate=300").json({brand:BRAND,developer:"ZULQARNAIN X HAIDER",...body});
const isoDuration=value=>{const m=String(value||"").match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);if(!m)return "";const h=Number(m[1]||0),min=Number(m[2]||0),sec=Number(m[3]||0);return h?h+":"+String(min).padStart(2,"0")+":"+String(sec).padStart(2,"0"):min+":"+String(sec).padStart(2,"0")};
export default async function handler(req,res){
 if(req.method!=="GET")return send(res,405,{error:{code:"method_not_allowed",message:"Use GET."}});
 const key=process.env.YOUTUBE_API_KEY;
 if(!key)return send(res,503,{error:{code:"youtube_key_missing",message:"Add YOUTUBE_API_KEY in Vercel Project Settings → Environment Variables, then redeploy."}});
 const q=String(req.query?.q||"").trim().slice(0,120);
 if(q.length<2)return send(res,400,{error:{code:"invalid_query",message:"Provide a title to search."}});
 try{
  const u=new URL("https://www.googleapis.com/youtube/v3/search");
  Object.entries({part:"snippet",q,type:"video",maxResults:"12",videoEmbeddable:"true",videoSyndicated:"true",videoDuration:"long",safeSearch:"moderate",regionCode:"PK",key}).forEach(([k,v])=>u.searchParams.set(k,v));
  const sr=await fetch(u,{signal:AbortSignal.timeout(12000)}),sd=await sr.json();
  if(!sr.ok)return send(res,sr.status===403?502:sr.status,{error:{code:"youtube_search_failed",message:sd?.error?.message||"YouTube Data API search failed."}});
  const ids=(sd.items||[]).map(x=>x.id?.videoId).filter(Boolean);
  if(!ids.length)return send(res,200,{api:"ZXH YouTube Search",count:0,results:[]});
  const d=new URL("https://www.googleapis.com/youtube/v3/videos");
  Object.entries({part:"contentDetails,status",id:ids.join(","),key}).forEach(([k,v])=>d.searchParams.set(k,v));
  const dr=await fetch(d,{signal:AbortSignal.timeout(12000)}),dd=await dr.json();
  if(!dr.ok)return send(res,502,{error:{code:"youtube_details_failed",message:dd?.error?.message||"Could not load video details."}});
  const map=new Map((dd.items||[]).map(x=>[x.id,x]));
  const results=(sd.items||[]).flatMap(x=>{const id=x.id?.videoId,detail=map.get(id),sn=x.snippet||{};if(!id||detail?.status?.embeddable!==true)return [];return [{id,title:String(sn.title||"Untitled").slice(0,200),description:String(sn.description||"").slice(0,500),channel:String(sn.channelTitle||"YouTube").slice(0,100),thumbnail:sn.thumbnails?.high?.url||sn.thumbnails?.medium?.url||sn.thumbnails?.default?.url||"",duration:isoDuration(detail.contentDetails?.duration)}]});
  return send(res,200,{api:"ZXH YouTube Embedded Search",count:results.length,results});
 }catch{return send(res,502,{error:{code:"youtube_connection_failed",message:"Could not connect to YouTube Data API."}})}
}