const BRAND = "ZXH-OFFICIAL";
const IA_SEARCH = "https://archive.org/advancedsearch.php";
const IA_METADATA = "https://archive.org/metadata/";
const json = (res, status, body) => res.status(status).setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600").json({brand:BRAND,developer:"ZULQARNAIN X HAIDER",...body});
export default async function handler(req,res) {
  if(req.method!=="GET") return json(res,405,{error:{code:"method_not_allowed",message:"Use GET."}});
  const q=String(req.query?.q||"").trim().slice(0,100);
  if(q.length<2) return json(res,400,{error:{code:"invalid_query",message:"Provide a title with at least 2 characters."}});
  try {
    const safe=q.replace(/[\\"]/g," ").replace(/\s+/g," ").trim();
    const url=new URL(IA_SEARCH);
    url.searchParams.set("q",`mediatype:movies AND title:"${safe}"`);
    ["identifier","title"].forEach(field=>url.searchParams.append("fl[]",field));
    url.searchParams.set("rows","12");url.searchParams.set("page","1");url.searchParams.set("output","json");
    const sr=await fetch(url,{headers:{"User-Agent":"ZXH-OFFICIAL-MoviesHub/1.0"},signal:AbortSignal.timeout(12000)});
    if(!sr.ok) return json(res,502,{error:{code:"archive_search_failed",message:"Internet Archive search is temporarily unavailable."}});
    const docs=(await sr.json())?.response?.docs||[];
    const results=await Promise.all(docs.slice(0,8).map(async doc=>{
      const id=String(doc.identifier||"");if(!/^[a-zA-Z0-9._-]{1,180}$/.test(id))return null;
      try{
        const r=await fetch(IA_METADATA+encodeURIComponent(id),{signal:AbortSignal.timeout(10000)});if(!r.ok)return null;
        const data=await r.json(),meta=data?.metadata||{};
        const rights=[meta.licenseurl,meta.rights].flat().filter(Boolean).join(" ").toLowerCase();
        if(!/public.?domain|creativecommons\.org\/licenses\//i.test(rights))return null;
        const files=(data.files||[]).filter(f=>{const n=String(f.name||"").toLowerCase(),fmt=String(f.format||"").toLowerCase();return !f.source&&!f.private&&!f.encrypted&&(fmt.includes("mpeg4")||fmt==="h.264"||fmt==="webm"||/\.(mp4|m4v|webm)$/.test(n));}).sort((a,b)=>Number(b.size||0)-Number(a.size||0));
        const file=files[0];if(!file)return null;
        const format=String(file.format||"").toLowerCase().includes("webm")?"WebM":"MPEG4";
        return {id,title:String(meta.title||doc.title||id).slice(0,180),format,license:String(meta.licenseurl||meta.rights||"Open license").slice(0,180),poster:`https://archive.org/services/img/${encodeURIComponent(id)}`,url:`https://archive.org/download/${encodeURIComponent(id)}/${file.name.split("/").map(encodeURIComponent).join("/")}`};
      }catch{return null;}
    }));
    return json(res,200,{api:"ZXH Archive Stream Search",count:results.filter(Boolean).length,results:results.filter(Boolean)});
  }catch{return json(res,502,{error:{code:"upstream_connection_failed",message:"Could not connect to Internet Archive."}});}
}
