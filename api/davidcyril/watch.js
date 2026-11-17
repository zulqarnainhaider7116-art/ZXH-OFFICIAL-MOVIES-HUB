const API_ORIGIN="https://apis.davidcyril.name.ng";
const BRAND={name:"ZXH OFFICIAL",developer:"ZULQARNAIN X HAIDER"};

export default async function handler(req,res){
  res.setHeader("Cache-Control","s-maxage=120, stale-while-revalidate=240");
  res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method!=="GET"){
    res.setHeader("Allow","GET");
    return res.status(405).json({success:false,brand:BRAND,error:{code:"method_not_allowed",message:"Use GET."}});
  }
  const q=String(req.query?.q||"").trim().slice(0,160);
  const tmdb=String(req.query?.tmdb||"").trim();
  const type=String(req.query?.type||"movie").toLowerCase()==="tv"?"tv":"movie";
  const season=String(req.query?.season||"1");
  const episode=String(req.query?.episode||"1");
  if(!q||!/^[0-9]+$/.test(tmdb)||!/^[0-9]+$/.test(season)||!/^[0-9]+$/.test(episode)){
    return res.status(400).json({success:false,brand:BRAND,error:{code:"invalid_parameters",message:"A title, TMDB ID, season and episode are required."}});
  }
  try{
    const url=new URL("/movies/watch",API_ORIGIN);
    url.searchParams.set("q",q);
    url.searchParams.set("tmdb",tmdb);
    url.searchParams.set("type",type);
    url.searchParams.set("season",season);
    url.searchParams.set("episode",episode);
    const upstream=await fetch(url.toString(),{headers:{Accept:"application/json"},signal:AbortSignal.timeout(25000)});
    const payload=await upstream.json().catch(()=>null);
    if(!upstream.ok||!payload||payload.success!==true||!payload.result){
      return res.status(upstream.status>=400&&upstream.status<500?upstream.status:502).json({
        success:false,brand:BRAND,error:{code:"server7_unavailable",message:payload?.error?.message||"SERVER 7 could not resolve this title."}
      });
    }
    return res.status(200).json({success:true,brand:BRAND,result:payload.result});
  }catch{
    return res.status(502).json({success:false,brand:BRAND,error:{code:"server7_connection_failed",message:"Could not connect to SERVER 7. Please try another server."}});
  }
}