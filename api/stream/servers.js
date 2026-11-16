const BRAND="ZXH OFFICIAL";
export default async function handler(req,res){
  res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=600");
  res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method!=="GET")return res.status(405).json({brand:BRAND,error:"Method not allowed"});
  try{
    const response=await fetch("https://api.anyplay.stream/v1/servers",{headers:{"Accept":"application/json"},signal:AbortSignal.timeout(10000)});
    if(!response.ok)return res.status(502).json({brand:BRAND,error:"Playback options are temporarily unavailable"});
    const payload=await response.json();
    const list=Array.isArray(payload)?payload:(payload.servers||payload.results||[]);
    const servers=list.filter(x=>x&&x.id).map((x,index)=>({id:String(x.id),name:"Option "+(index+1)}));
    if(!servers.length)return res.status(502).json({brand:BRAND,error:"No playback options are currently available"});
    return res.status(200).json({brand:BRAND,servers});
  }catch{
    return res.status(502).json({brand:BRAND,error:"Unable to load playback options"});
  }
}