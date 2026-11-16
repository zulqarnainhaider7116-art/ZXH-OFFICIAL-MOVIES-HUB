const BRAND="ZXH OFFICIAL";
const SERVER_LABELS={
  "68ca4cbd203ee8afe6ee44cb":{name:"SERVER 1 · VIDEASY",domain:"player.videasy.to"},
  "68ca4cd1203ee8afe6ee44cc":{name:"SERVER 2",domain:""},
  "68ca4cdd203ee8afe6ee44cd":{name:"SERVER 3",domain:""},
  "68ca4cea203ee8afe6ee44ce":{name:"SERVER 4",domain:""},
  "68ca4cf7203ee8afe6ee44cf":{name:"SERVER 5 · STELLAR",domain:"stellarconductornexus.com"},
  "68ca4d03203ee8afe6ee44d0":{name:"SERVER 6 · VIDLINK",domain:"vidlink.pro"},
  "68ca4d15203ee8afe6ee44d1":{name:"SERVER 7 · VIDZEE",domain:"player.vidzee.wtf"},
  "68cc06b42672fdfecc749029":{name:"SERVER 8 · VIDROCK",domain:"vidrock.net"},
  "68cc56953768c48a4c4055a9":{name:"SERVER 9 · VIDNEST",domain:"vidnest.net"}
};
export default async function handler(req,res){
  res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=600");
  res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method!=="GET")return res.status(405).json({brand:BRAND,error:"Method not allowed"});
  try{
    const response=await fetch("https://api.anyplay.stream/v1/servers",{headers:{"Accept":"application/json"},signal:AbortSignal.timeout(10000)});
    if(!response.ok)return res.status(502).json({brand:BRAND,error:"Playback options are temporarily unavailable"});
    const payload=await response.json();
    const list=Array.isArray(payload)?payload:(payload.servers||payload.results||[]);
    const servers=list.filter(x=>x&&x.id).map((x,index)=>{
      const id=String(x.id);
      const mapped=SERVER_LABELS[id];
      return {
        id,
        name:mapped?.name||"SERVER "+(index+1),
        domain:mapped?.domain||""
      };
    });
    if(!servers.length)return res.status(502).json({brand:BRAND,error:"No playback options are currently available"});
    return res.status(200).json({brand:BRAND,servers});
  }catch{
    return res.status(502).json({brand:BRAND,error:"Unable to load playback options"});
  }
}