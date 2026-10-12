const cheerio = require('cheerio');
const BASE = 'https://otakudesu.blog';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
function allowed(raw) {
  const u = new URL(raw, BASE);
  if (u.protocol !== 'https:' || u.hostname !== 'otakudesu.blog') throw new Error('URL sumber harus berada di https://otakudesu.blog');
  return u;
}
async function getHtml(url) {
  const u = allowed(url);
  const r = await fetch(u.href, {headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8','accept-language':'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7','cache-control':'no-cache','referer':BASE+'/'}, redirect:'follow', signal:AbortSignal.timeout(15000)});
  if (!r.ok) throw new Error(`Sumber membalas HTTP ${r.status}`);
  const type = r.headers.get('content-type') || '';
  if (!type.includes('text/html')) throw new Error('Respons sumber bukan HTML');
  return {html: await r.text(), url:r.url || u.href};
}
const txt = (el) => (el.text() || '').replace(/\s+/g,' ').trim();
function abs(href, base=BASE) { try { const u=new URL(href,base); return u.protocol==='https:' ? u.href : ''; } catch { return ''; } }
function firstText($, selectors) { for (const s of selectors) { const el=$(s).first(); if(el.length && txt(el)) return txt(el); } return ''; }
function parseCatalog(html, baseUrl=BASE) {
  const $=cheerio.load(html); const items=[]; const seen=new Set();
  // Prefer known Otakudesu card containers, then fall back to internal anime links.
  const selectors=['.venz .detpost','.venz ul li','.detpost','.animepost','.listupd .bs','.listupd article','.chivsrc li','.search-result .item'];
  let cards=$(); for(const s of selectors){const found=$(s); if(found.length){cards=found;break;}}
  function addCard(c, fallbackAnchor) {
    const a=fallbackAnchor ? $(fallbackAnchor) : c.find('a[href]').filter((_,el)=>{const h=$(el).attr('href')||'';return /otakudesu\.blog\//i.test(h) && !/\/(episode|genre|batch|author|page)\//i.test(h)}).first();
    const href=abs(a.attr('href'),baseUrl); if(!href || seen.has(href) || href===baseUrl || /\/(episode|genre|batch)\//i.test(new URL(href).pathname)) return;
    const img=c.find('img').first();
    const title=(c.find('.jdlflm, .thumb h2, h2, .tt, .title, .anime-title, .entry-title').first().attr('title')||txt(c.find('.jdlflm, .thumb h2, h2, .tt, .title, .anime-title, .entry-title').first())||a.attr('title')||txt(a)).trim();
    if(!title || title.length<2) return;
    seen.add(href); const poster=abs(img.attr('data-src')||img.attr('data-lazy-src')||img.attr('data-original')||img.attr('src')||'',baseUrl);
    const ep=txt(c.find('.epz, .epx, .sb, .episode, .ep').first()); const status=txt(c.find('.status, .epztipe, .type').first());
    items.push({title,url:href,slug:href.replace(/\/$/,'').split('/').pop(),poster,latest:ep,status});
  }
  if(cards.length) cards.each((_,el)=>addCard($(el)));
  // Robust fallback for theme changes: collect links that look like anime detail pages.
  if(!items.length) {
    $('a[href]').each((_,el)=>{
      const a=$(el), href=abs(a.attr('href'),baseUrl); if(!href) return;
      const path=new URL(href).pathname;
      if(!href.startsWith(BASE+'/') || href===BASE+'/' || /\/(episode|genre|batch|page|category|tag)\//i.test(path) || /[?&](s|page)=/i.test(href)) return;
      const title=(a.attr('title')||txt(a)).trim();
      if(!title || title.length<2 || /^(home|next|previous|login|register)$/i.test(title)) return;
      const parent=a.closest('.detpost, .animepost, .bs, article, li, .chivsrc, .thumb');
      addCard(parent.length?parent:a, el);
    });
  }
  return {items, title:firstText($,['title','h1']), pageTitle:firstText($,['.jdlflm','h1'])};
}
function parseDetail(html, pageUrl) {
 const $=cheerio.load(html); const title=firstText($,['.infoanime .infox h2','h1.entry-title','h1','title']);
 const poster=abs($('.fotoanime img, .thumb img, .animeinfo img, .infoanime img').first().attr('data-src')||$('.fotoanime img, .thumb img, .animeinfo img, .infoanime img').first().attr('src')||'',pageUrl);
 const synopsis=firstText($,['.sinopc','.desc','[itemprop="description"]','.entry-content p']);
 const info=[]; $('.infoanime .infox .info-content, .infoanime .infox, .infox, .infoanime').first().find('span, p').each((_,e)=>{const t=txt($(e)); if(t && t.length<180 && !info.includes(t)) info.push(t)});
 const episodes=[]; const seen=new Set();
 $('.episodelist ul li, .episodelist li, .episode-list li, .daftar-episode li, .eplister ul li, .episodelist ul, .eplister li, .venz li').each((_,el)=>{const a=$(el).find('a[href]').first(); const url=abs(a.attr('href'),pageUrl); const name=txt(a); if(url&&name&&!seen.has(url)){seen.add(url); episodes.push({title:name,url,slug:url.replace(/\/$/,'').split('/').pop(),date:txt($(el).find('.zeebr, .date, span').last())})}});
 // Some pages use anchors without list wrappers.
 if(!episodes.length) $('.episodelist a[href], .episode-list a[href], a[href*="episode"]').each((_,el)=>{const a=$(el),url=abs(a.attr('href'),pageUrl),name=txt(a);if(url&&name&&url!==pageUrl&&!seen.has(url)&&url.includes('otakudesu.blog')){seen.add(url);episodes.push({title:name,url,slug:url.replace(/\/$/,'').split('/').pop(),date:''})}});
 return {title,poster,synopsis,info,episodes,url:pageUrl};
}
function parseWatch(html, pageUrl) {
 const $=cheerio.load(html); const title=firstText($,['h1.entry-title','.entry-title','h1','title']);
 const embeds=[]; const seen=new Set();
 $('iframe[src], iframe[data-src], .responsive-embed iframe, .player-embed iframe').each((_,el)=>{const raw=$(el).attr('src')||$(el).attr('data-src'); if(!raw)return; const url=abs(raw,pageUrl); if(url&&!seen.has(url)){seen.add(url);embeds.push({url,label:$(el).attr('title')||'Pemutar eksternal'})}});
 $('a[href]').each((_,el)=>{const a=$(el),label=txt(a),href=abs(a.attr('href'),pageUrl);if(!href)return;if(/(mirror|stream|player|mp4|m3u8)/i.test(label+' '+href)&&!seen.has(href)&&href!==pageUrl){seen.add(href);embeds.push({url:href,label:label||'Sumber video'})}});
 const episodeNav=[]; $('a[href]').each((_,el)=>{const a=$(el),url=abs(a.attr('href'),pageUrl),label=txt(a);if(url&&label&&url.includes('otakudesu.blog')&&/(episode|prev|next|sebelum|selanjut)/i.test(label+' '+url))episodeNav.push({url,title:label})});
 return {title,embeds,episodeNav,url:pageUrl};
}
module.exports={BASE,allowed,getHtml,parseCatalog,parseDetail,parseWatch};
