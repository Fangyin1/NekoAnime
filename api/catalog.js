const {BASE,getHtml,parseCatalog}=require('./_source');
module.exports=async function(req,res){
 res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600');
 res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='GET')return res.status(405).json({error:'Method tidak diizinkan'});
 try{const q=String(req.query.q||'').trim(); const page=Math.max(1,Math.min(100,parseInt(req.query.page||'1',10)||1)); let url;
 if(q){url=new URL('/',BASE);url.searchParams.set('s',q)}else{url=new URL('/',BASE);if(page>1)url.pathname=`/page/${page}/`}
 const {html,url:finalUrl}=await getHtml(url.href);const parsed=parseCatalog(html,finalUrl);
 return res.status(200).json({ok:true,source:BASE,query:q,page,items:parsed.items,title:parsed.pageTitle||parsed.title,updatedAt:new Date().toISOString(),count:parsed.items.length});
 }catch(e){console.error('Neko catalog error:',e.message);return res.status(502).json({ok:false,error:'Katalog sumber gagal dibaca. Struktur situs mungkin berubah atau sumber sedang tidak tersedia.',detail:e.message});}
};
