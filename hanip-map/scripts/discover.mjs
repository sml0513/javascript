// Pass an async webSearch(request) adapter returning the search service's plain text.
// discover reads public district directories and checks the actual itemized menu per shop.
export async function discover({webSearch, food, districts, date, known=[], onProgress=()=>{}}){
 const base='https://dessertnow.j-curve.co.kr/';
 const seen=new Set(known.map(s=>s.name+'|'+s.district));
 const shops=[], searches=[], errors=[];
 const tokens=food.terms || [food.name];
 const textKey=s=>s.normalize('NFKC').replace(/\s/g,'').toLowerCase();
 async function read(request){const t=await webSearch(request);if(!t)throw Error('빈 검색 응답');return t}
 async function visit(link,district){
  const page=await read({click:[link],n_tokens:4200});
  const source=page.match(/\((https:\/\/dessertnow\.j-curve\.co\.kr\/[^)\s]+)\)/)?.[1];
  const name=page.match(/L\d+: # ([^\n]+)/)?.[1];
  const address=page.match(/주소\nL\d+:\s+(서울[^\n]+)/)?.[1];
  const menuSection=page.split(/## 메뉴[^\n]*\n/)[1]?.split(/재고 출처|## 근처/)[0] || '';
  const items=[...menuSection.matchAll(/L\d+:\s+\* ([^\n]+?)\s+(?:[\d,~]+원|가격 변동)/g)];
  const match=items.find(m=>tokens.some(t=>textKey(m[1]).includes(textKey(t))) && !(food.excludeTerms || []).some(t=>textKey(m[1]).includes(textKey(t))));
  if(!source || !name || !address?.includes(district) || !match)return;
  const idx=page.match(/【(\d+)†카카오맵/),ref=page.match(/【(turn\w+view\d+)】/);
  if(!idx||!ref)throw Error(name+' 지도 링크 누락');
  const response=await read({click:[{ref_id:ref[1],id:Number(idx[1])}],n_tokens:400});
  const point=decodeURIComponent(response).match(/(37\.\d+)[,/]((?:126|127)\.\d+)/);
  if(!point)throw Error(name+' 좌표 미확인');
  shops.push({food:food.id,name,district,address,coords:[+point[1],+point[2]],menu:match[1],observed:date,source,sourceLabel:'수집된 지점 메뉴 ↗',map:'https://map.kakao.com/link/map/'+encodeURIComponent(name)+','+point[1]+','+point[2]});
 }
 for(const district of districts){
  try{
   const page=await read({open:[{ref_id:base+'서울/'+district+'/'+food.name+'/'}],n_tokens:14000});
   const ref=page.match(/【(turn\w+view\d+)】/);
   if(!ref||!page.includes('매장 목록')){errors.push(district+' 목록 확인 필요');continue}
   const labels=[...page.matchAll(/【(\d+)†([^【】]+?) 서울 ([가-힣]+구) ([^【】]+?)】/g)];
   const links=labels.filter(m=>m[3]===district && !seen.has(m[2].replace(/ SNS 화제$/,'').trim()+'|'+district)).map(m=>({ref_id:ref[1],id:+m[1]}));
   for(let i=0;i<links.length;i+=6){
    const results=await Promise.allSettled(links.slice(i,i+6).map(link=>visit(link,district)));
    for(const result of results)if(result.status==='rejected')errors.push(district+' '+result.reason);
   }
   searches.push({food:food.id,district,date});
  }catch(e){errors.push(district+' '+e)}
  await onProgress({shops,searches,errors});
 }
 return {shops,searches,errors};
}
