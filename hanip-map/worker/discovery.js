const sourceRoot = 'https://nowdongne.com';
const districts = new Set('강남 강동 강북 강서 관악 광진 구로 금천 노원 도봉 동대문 동작 마포 서대문 서초 성동 성북 송파 양천 영등포 용산 은평 종로 중 중랑'.split(' ').map(name => name + '구'));
const keyOf = value => value.normalize('NFKC').replace(/[\s·()]/g,'').toLowerCase();

function plain(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&(?:amp|quot|apos|lt|gt|nbsp|#\d+|#x[0-9a-f]+);/gi, entity => {
    const named = {amp:'&', quot:'"', apos:"'",lt:'<',gt:'>',nbsp:' '};
    const name = entity.slice(1,-1);
    if (name in named) return named[name];
    const number = name.startsWith('#x') ? parseInt(name.slice(2),16) : Number(name.slice(1));
    return number >= 0 && number <= 0x10ffff ? String.fromCodePoint(number) : '';
  }).replace(/\s+/g, ' ').trim();
}

function links(html) {
  return Array.from(html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi), match => ({
    href: match[1].replace(/&amp;/g,'&'),
    content: match[2]
  }));
}

async function getText(url) {
  const response = await fetch(url, {signal: AbortSignal.timeout(6500), headers:{'User-Agent':'HanipMap/1.0 (daily public food catalog)'}});
  if (!response.ok) throw Error('출처 응답 ' + response.status);
  const text = await response.text();
  if (text.length > 2_000_000) throw Error('출처 페이지 크기 초과');
  return text;
}

function dateInSeoul(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}

function rankItems(html) {
  const date = html.match(/(\d{4}-\d{2}-\d{2})\s*기준/)?.[1];
  const ranked = links(html).flatMap(({href,content}) => {
    if (!/^\/dessert\/[a-z0-9-]+$/.test(href)) return [];
    const rank = Number(content.match(/class="no">\s*(\d+)/)?.[1]);
    const name = plain(content.match(/class="nm">([^<]+)/)?.[1] || '');
    if (!rank || !name) return [];
    return [{path:href, rank, name, date}];
  });
  if (!date || ranked.length < 3) throw Error('순위 목록 형식 변경');
  return ranked;
}

const reelsRoot = 'https://www.hypenow.io';

function withinDays(date, today, days) {
  const age=(Date.parse(today)-Date.parse(date))/86400000;
  return age>=0 && age<=days;
}

async function reelsReports(today) {
  const html=await getText(reelsRoot+'/contents');
  const paths=[...new Set(links(html).map(link=>link.href))]
    .filter(path=>/^\/contents\/\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\/analysis-report$/.test(path))
    .filter(path=>withinDays(path.split('_')[1].split('/')[0],today,28))
    .sort((a,b)=>b.localeCompare(a)).slice(0,7);
  const reports=await Promise.allSettled(paths.map(async (path)=>{
    const report=await getText(reelsRoot+path);
    const headings=[...report.matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)]
      .map(m=>plain(m[1])).filter(title=>/^F\s*&\s*B\s*\d+위/i.test(title));
    return {url:reelsRoot+path,headings};
  }));
  return reports.flatMap(result=>result.status==='fulfilled' ? [result.value] : []);
}

function fromReels(reports, food) {
  const report=reports.find(report=>report.headings.some(title=>keyOf(title).includes(keyOf(food.name))));
  return report ? {label:'하입나우 · 인스타그램 릴스 분석',url:report.url} : null;
}

async function independentNews(food, today) {
  const url = new URL('https://news.google.com/rss/search');
  url.search = new URLSearchParams({q:'"' + food.name + '" when:28d',hl:'ko',gl:'KR',ceid:'KR:ko'});
  const xml = await getText(url);
  for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const title = plain(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '');
    const publisher = plain(item.match(/<source\b[^>]*>([\s\S]*?)<\/source>/)?.[1] || '');
    const source = item.match(/<source\b[^>]*\burl="([^"]+)"/)?.[1] || '';
    const href = item.match(/<link>(https:\/\/news\.google\.com\/[^<]+)<\/link>/)?.[1];
    const time = new Date(item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] || '');
    if (!href || !publisher || !source || !Number.isFinite(+time)) continue;
    if (/nowdongne|instagram|youtube|facebook|blog\.naver/i.test(source)) continue;
    const date = dateInSeoul(time);
    if (!withinDays(date,today,28) || !keyOf(title).includes(keyOf(food.name))) continue;
    if (!/유행|화제|인기|열풍|품절|오픈런|떡픈런|SNS|인스타그램|줄\s*서|급상승|트렌드/i.test(title)) continue;
    return {label:publisher+' · '+date, url:href.replace(/&amp;/g,'&')};
  }
  return null;
}

function snackPaths(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || '';
  if (!/<h1\b/.test(main)) throw Error('판매처 목록 형식 변경');
  return links(main).filter(({href}) => /^\/snack\/[a-f0-9]{16}$/.test(href)).map(({href}) => href);
}

// Branded limited-release items need an explicit match to the reported branch.
const limitedReleases = {
  'auto-49650810': {name:'고디바 롯데월드몰점', district:'송파구'}
};

function matchesReleaseBranch(food, name, district) {
  const branch=limitedReleases[food];
  return !branch || (keyOf(name)===keyOf(branch.name) && district===branch.district);
}

function readShop(html, task, today) {
  const records = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  const business = records.map(match => {
    try { return JSON.parse(match[1]); } catch { return null; }
  }).find(record => record?.geo && record.address);
  if (!business) return null;
  const {name, address, geo} = business;
  if (typeof name !== 'string' || !name.trim() || name.length > 120) return null;
  if (!/^서울(?:특별시|시)?(?:\s|$)/.test(address.addressRegion || '') ||
      address.addressLocality !== task.district) return null;
  if(!matchesReleaseBranch(task.food,name,task.district))return null;
  const coords = [Number(geo.latitude), Number(geo.longitude)];
  if (!(coords[0]>=37.42 && coords[0]<=37.71 && coords[1]>=126.76 && coords[1]<=127.19)) return null;
  const proof = plain(html.match(/class="k">\s*판매 확인\s*<\/span>\s*<span class="v">([\s\S]*?)<\/span>/i)?.[1] || '');
  const dated = proof.match(/(네이버\s*플레이스\s*메뉴|(?:네이버\s*)?방문자\s*리뷰|(?:네이버\s*)?블로그\s*리뷰)\s*·\s*(\d{4}-\d{2}-\d{2})/);
  if (!dated || dated[2]>today) return null;
  const description = plain(html.match(/class="k">\s*파는 디저트\s*<\/span>\s*<span class="v">([\s\S]*?)<\/span>/i)?.[1] || '');
  if (!description.split('·').some(name => keyOf(name.trim())===keyOf(task.name))) return null;
  return {
    food:task.food, name:name.trim(), district:task.district, address:address.streetAddress, coords,
    menu: task.name, observed: today, evidenceDate:dated[2],
    sourceLabel: dated[1] + ' 확인 기록', source:sourceRoot+task.path,
    map:'https://map.kakao.com/link/map/'+encodeURIComponent(name)+','+coords.join(',')
  };
}

function addShop(catalog, shop) {
  const existing = catalog.shops.some(s => s.food===shop.food && (
    s.source===shop.source || s.map===shop.map ||
    (s.district===shop.district && keyOf(s.name)===keyOf(shop.name) &&
      Math.hypot(s.coords[0]-shop.coords[0],s.coords[1]-shop.coords[1])<0.002)
  ));
  if (existing) return false;
  catalog.shops.push(shop);
  return true;
}

function seoulDistricts(html, item) {
  return links(html).flatMap(({href}) => {
    const parts = decodeURI(href).split('/');
    if (parts.length!==5 || parts[2]!==item.path.split('/')[2] || parts[3]!=='서울특별시' || !districts.has(parts[4])) return [];
    return [{...item,kind:'district',path:href,food:item.id,district:parts[4],rankPath:item.path}];
  });
}

async function startDay(catalog, progress, today) {
  const [ranking,reels]=await Promise.allSettled([getText(sourceRoot+'/dessert'),reelsReports(today)]);
  if(ranking.status==='rejected')throw ranking.reason;
  const ranked = rankItems(ranking.value);
  const reports = reels.status==='fulfilled' ? reels.value : [];
  if ((Date.parse(today)-Date.parse(ranked[0].date))/86400000 > 3) throw Error('최신 순위 자료를 기다리는 중');
  const current = new Map(catalog.foods.map(food => [keyOf(food.name), food]));
  const candidates = ranked.filter(item=>current.has(keyOf(item.name)) || item.rank<=8);
  const results = await Promise.allSettled(candidates.map(async item => {
    const existing = current.get(keyOf(item.name));
    if (existing) return {...item,id:existing.id};
    const evidence = fromReels(reports,item) || await independentNews(item,today);
    return evidence && {...item,id:item.path.split('/').pop(),evidence};
  }));
  progress.errors += results.filter(r => r.status==='rejected').length;
  progress.queue = results.flatMap(result => result.status==='fulfilled' && result.value ? [{kind:'food',...result.value}] : []);
  progress.rankingDate = ranked[0].date;
}

async function processTask(task, catalog, progress, today) {
  const html = await getText(sourceRoot + task.path);
  if (task.kind==='food') {
    const routes = seoulDistricts(html,task);
    if (routes.length) progress.queue.unshift(...routes);
    return;
  }
  if (task.kind==='district') {
    const paths = [...new Set(snackPaths(html))];
    for (const path of paths.reverse()) {
      const key = task.food+':'+path;
      if (!progress.seen.includes(key)) {
        progress.seen.push(key);
        if (!catalog.shops.some(shop=>shop.food===task.food && shop.source===sourceRoot+path)) {
          progress.queue.unshift({...task,kind:'shop',path});
        }
      }
    }
    return;
  }
  const shop = readShop(html,task,today);
  if(!shop)return;
  if(!catalog.foods.some(food=>food.id===task.food)){
    catalog.foods.push({
      id:task.food, name:task.name, added:today,
      source:'우리동네 뭐 바뀜? · '+ task.date +' 디저트 순위',
      url:sourceRoot+task.rankPath, more:[task.evidence],
      reason:task.date+' 공개 디저트 순위 '+task.rank+'위에 올랐고 '+(task.evidence.label.includes('릴스')?'인스타그램 릴스 분석에도 등장했어요.':'최근 보도에서도 언급됐어요.')
    });
    progress.foodsAdded++;
  }
  if(addShop(catalog,shop))progress.shopsAdded++;
}
