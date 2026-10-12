const cheerio = require('cheerio');
const BASE = 'https://otakudesu.blog';
const UA = 'NekoAnimeId/1.0 (authorized catalog integration)';
function allowed(raw) {
  const u = new URL(raw, BASE);
  if (u.protocol !== 'https:' || u.hostname !== 'otakudesu.blog') throw new Error('URL sumber harus berada di https://otakudesu.blog');
  return u;
}
async function getHtml(url) {
  const u = allowed(url);
  const r = await fetch(u.href, {headers:{'user-agent':UA,'accept':'text/html,application/xhtml+xml'}, signal:AbortSignal.timeout(8000)});
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
  const selectors=['.venz .detpost','.venz ul li','.detpost','.animepost','.listupd .bs','.listupd article','.search .chivsrc li'];
  let cards=$(); for(const s of selectors){const found=$(s); if(found.length){cards=found;break;}}
  cards.each((_,el)=>{const c=$(el); const a=c.find('a[href]').first(); const href=abs(a.attr('href'),baseUrl); if(!href || seen.has(href)) return; const title=(c.find('.jdlflm, .thumb h2, h2, .tt, .title, .thumb a').first().attr('title')||txt(c.find('.jdlflm, .thumb h2, h2, .tt, .title').first())||a.attr('title')||txt(a)).trim(); if(!title) return; seen.add(href); const img=c.find('img').first(); const poster=abs(img.attr('data-src')||img.attr('data-lazy-src')||img.attr('src')||'',baseUrl); const ep=txt(c.find('.epz, .epx, .sb, .episode').first()); const status=txt(c.find('.status, .epztipe, .type').first()); items.push({title,url:href,slug:href.replace(/\/$/,'').split('/').pop(),poster,latest:ep,status});});
  return {items, title:firstText($,['title','h1']), pageTitle:firstText($,['.jdlflm','h1'])};
}
function parseDetail(html, pageUrl) {
 const $=cheerio.load(html); const title=firstText($,['.infoanime .infox h2','h1.entry-title','h1','title']);
 const poster=abs($('.fotoanime img, .thumb img, .animeinfo img, .infoanime img').first().attr('data-src')||$('.fotoanime img, .thumb img, .animeinfo img, .infoanime img').first().attr('src')||'',pageUrl);
 const synopsis=firstText($,['.sinopc','.desc','[itemprop="description"]','.entry-content p']);
 const info=[]; $('.infoanime .infox .info-content, .infoanime .infox, .infox, .infoanime').first().find('span, p').each((_,e)=>{const t=txt($(e)); if(t && t.length<180 && !info.includes(t)) info.push(t)});
 const episodes=[]; const seen=new Set();
 $('.episodelist ul li, .episodelist li, .episode-list li, .daftar-episode li, .eplister ul li').each((_,el)=>{const a=$(el).find('a[href]').first(); const url=abs(a.attr('href'),pageUrl); const name=txt(a); if(url&&name&&!seen.has(url)){seen.add(url); episodes.push({title:name,url,slug:url.replace(/\/$/,'').split('/').pop(),date:txt($(el).find('.zeebr, .date, span').last())})}});
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
