// node scripts/update-catalog.mjs plan|merge path/to/data.js [batch.json]
import fs from 'node:fs';
const [mode, path, incoming] = process.argv.slice(2);
const districts = '강남 강동 강북 강서 관악 광진 구로 금천 노원 도봉 동대문 동작 마포 서대문 서초 성동 성북 송파 양천 영등포 용산 은평 종로 중 중랑'.split(' ').map(s => s+'구');
const read = () => fs.readFileSync(path,'utf8');
const original = read();
const data = JSON.parse(original.trim().replace(/^const catalog = /,'').replace(/;$/,''));
const batch = incoming ? JSON.parse(fs.readFileSync(incoming,'utf8')) : {};
const normalize = s => s.normalize('NFKC').toLowerCase().replace(/[\s·()]/g,'');
function requireValue(value,message){if(!value) throw Error(message)}
function url(s){return typeof s==='string' && /^https:\/\//.test(s)}
for(const food of batch.foods || []){
 requireValue(food.id && food.name && food.reason && url(food.url) && food.more?.some(x=>url(x.url) && new URL(x.url).hostname!==new URL(food.url).hostname),'독립적인 음식 선정 출처가 필요합니다');
 const existing = data.foods.find(f=>f.id===food.id || normalize(f.name)===normalize(food.name));
 if(existing){requireValue(existing.id===food.id,'기존 음식 ID를 사용하세요');Object.assign(existing,food)}
 else data.foods.push(food);
}
if(mode==='plan'){
 for(const food of data.foods)for(const district of districts)
  console.log(JSON.stringify({food:food.id,district,query:'서울 '+district+' '+food.name+' 판매 메뉴 매장',lastSearch:data.searchLog?.[food.id]?.[district] || null}));
}else if(mode==='merge'){
 for(const shop of batch.shops || []){
  requireValue(data.foods.some(f=>f.id===shop.food) && districts.includes(shop.district) && shop.name && shop.menu,'음식·서울 자치구·지점명·메뉴 확인 필요');
  requireValue(shop.coords?.length===2 && shop.coords.every(Number.isFinite) && shop.coords[0]>=37.42 && shop.coords[0]<=37.71 && shop.coords[1]>=126.76 && shop.coords[1]<=127.19 && url(shop.source) && url(shop.map),'근거·좌표·지도 필요');
  const food=data.foods.find(f=>f.id===shop.food);
  if(food.excludeTerms?.some(term=>normalize(shop.menu).includes(normalize(term))))continue;
  const same=data.shops.find(s=>s.food===shop.food && (s.map===shop.map || (s.district===shop.district && normalize(s.name)===normalize(shop.name) && Math.hypot(s.coords[0]-shop.coords[0],s.coords[1]-shop.coords[1])<0.002)));
  if(!same)data.shops.push(shop);
  else if(shop.checked || (!same.checked && !same.review))Object.assign(same,shop);
 }
 for(const item of batch.searches || []){
  requireValue(districts.includes(item.district) && data.foods.some(f=>f.id===item.food) && /^\d{4}-\d{2}-\d{2}$/.test(item.date),'잘못된 검색 기록');
  ((data.searchLog ??= {})[item.food] ??= {})[item.district]=item.date;
 }
 if(batch.reviewed)data.reviewed=batch.reviewed;
 const lock=path+'.lock';
 const fd=fs.openSync(lock,'wx');
 try {
 requireValue(read()===original,'다른 변경이 생겼습니다. 최신 자료에 다시 적용하세요.');
 const temp=path+'.'+process.pid+'.tmp';
 fs.writeFileSync(temp,'const catalog = '+JSON.stringify(data,null,2)+';\n',{flag:'wx'});
 fs.renameSync(temp,path);
 } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
 console.log(data.foods.length+' foods, '+data.shops.length+' listings');
}else throw Error('plan 또는 merge 모드를 지정하세요');
