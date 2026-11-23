const q = selector => document.querySelector(selector);
function element(tag, text, cls) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}
function link(label, url, cls) {
  const a = element('a', label, cls);
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  return a;
}
let selected = null;
let areaBounds = null;
function matchesArea(shop) {
  const region=q('#region').value;
  const district=q('#district').value;
  return (!region || shopRegion(shop)===region) && (!district || shop.district===district);
}

function displayedShops() {
  const query=q('#shopQuery').value.trim().toLocaleLowerCase();
  const foodIds=new Set(catalog.foods.map(food=>food.id));
  return catalog.shops.filter(shop=>{
    if(!matchesArea(shop) || !foodIds.has(shop.food) || (selected && selected!==shop.food))return false;
    if(q('#real').checked && !shop.checked)return false;
    if(areaBounds && (!shop.coords || !areaBounds.contains(shop.coords)))return false;
    return !query || [shop.name,shop.menu,shop.address,shopRegion(shop),shop.district].join(' ').toLocaleLowerCase().includes(query);
  });
}

function render(limit = 30, redrawMap = true) {
  if(typeof limit !== 'number')limit=30;
  const food=catalog.foods.find(item=>item.id===selected);
  for (const button of q('#cards').children) {
    const active = button.dataset.id === selected;
    button.setAttribute('aria-pressed', active);
    button.querySelector('em').textContent = active ? '✓ 선택됨' : '선택하기';
  }
  const result=q('#result');
  const shops=displayedShops();
  if(redrawMap)showShops(shops);
  const scope=areaBounds ? '검색 지역' : q('#district').value || q('#region').value || '전국';
  result.replaceChildren(element('div', scope + ' · ' + (food?.name || '전체 음식') + ' · ' + shops.length + '곳', 'count'));
  if (!shops.length) result.append(element('p', areaBounds ? '이 지역에 등록된 판매처가 없어요.' : '판매처를 확인 중이에요', 'empty'));
  for (const shop of shops.slice(0,limit)) {
    const card = element('article'), info = element('div', '', 'info'), title = element('h3', shop.name);
    const pin = element('div','','pin');
    pin.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
    if(shop.demo) title.append(element('small','시연용 예시','tag'));
    info.append(title,element('div',[shopRegion(shop),shop.district,shop.menu].filter(Boolean).join(' · ')),element('div','메뉴 확인일 · '+(shop.checked || '미확인'),'meta'));
    if(shop.observed && !shop.checked) info.append(element('small','수집 메뉴 자료 확인 · '+shop.observed,'meta'));
    if(shop.source) info.append(link(shop.sourceLabel || '메뉴판 보기 ↗',shop.source,'meta'));
    if(shop.coords) {
      const show = element('button','지도에서 위치 찾기','focus-shop');
      show.onclick = () => focusShop(shop);
      info.append(show);
    }
    card.append(pin,info,shop.map ? link('지도에서 보기 ↗',shop.map,'link') : element('span','지도 링크 준비 중','pending'));
    result.append(card);
  }
  if(shops.length>limit){
    const more=element('button','판매처 더 보기 ('+limit+'/'+shops.length+')','more-shops');
    more.onclick=()=>render(limit+30,false);
    result.append(more);
  }
}
function displayCatalog(){
  q('#cards').replaceChildren();
  q('#evidence').replaceChildren();
  for(const food of catalog.foods) {
    const b = element('button','','food'), img = element('img');
    b.dataset.id = food.id; if(food.image)img.src = food.image; img.alt = '';
    b.append(element('em'),element('strong',food.name),element('span',food.reason));
    if(food.image)b.append(img);
    b.onclick = () => { selected = selected === food.id ? null : food.id; render(); };
    q('#cards').append(b);
    const p=element('p',food.name+' · '); p.append(link(food.source,food.url)); for (const source of food.more || []) p.append(' · ',link(source.label,source.url));
    q('#evidence').append(p);
  }
  const covered=new Set(catalog.shops.map(shopRegion));
  q('#coverage').textContent='전국 '+covered.size+'/'+nationalRegions.length+'개 시·도에 판매처 등록 · 당일 재고는 방문 전 확인해 주세요.';
  updateDistricts();
  const sync=catalog.sync;
  if(sync?.state==='done' || sync?.state==='partial'){
    q('#review').textContent=sync.day+' 갱신 · 음식 '+sync.foodsAdded+'개, 판매처 '+sync.shopsAdded+'곳 추가'+(sync.state==='partial'?' · 일부 출처 미확인':'');
  }else if(sync?.state==='source-unavailable'){
    q('#review').textContent='출처에 연결하지 못했어요 · 최근 자료 '+catalog.reviewed;
  }else if(sync?.state==='running'){
    q('#review').textContent='전국 판매처 확인 중 · '+sync.shopsAdded+'곳 추가';
  }else{
    q('#review').textContent='최근 자료 '+catalog.reviewed+(sync?' · 매일 오전 7시 확인':'');
  }
  render();
}
displayCatalog();

const refreshButton=q('#refreshCatalog');
refreshButton.hidden=!catalog.sync;
refreshButton.onclick=async ()=>{
  refreshButton.disabled=true;
  try{
    let state;
    do{
      q('#review').textContent='유행 음식과 전국 판매처를 확인하고 있어요…';
      const response=await fetch('./api/refresh',{method:'POST'});
      if(!response.ok)throw Error('갱신 요청 실패');
      state=await response.json();
      const latest=await fetch('./api/catalog',{cache:'no-store'});
      if(!latest.ok)throw Error('갱신 자료 요청 실패');
      Object.assign(catalog,await latest.json());
      displayCatalog();
    }while(state.state==='running');
    if(state.state==='busy')q('#review').textContent='다른 갱신이 진행 중이에요.';
  }catch{
    q('#review').textContent='갱신에 실패했어요. 현재 지도 자료를 표시해요.';
  }finally{
    refreshButton.disabled=false;
  }
};

q('#allPins').onclick=()=>{
 request++;
 selected=null;
 areaBounds=null;
 q('#allArea').hidden=true;
 q('#real').checked=false;
 q('#region').value='';
 updateDistricts('');
 q('#shopQuery').value='';
 atlas.closePopup();
 fitShops();
 render();
 statusNode.textContent='전국 판매처를 표시했어요.';
};
q('#real').onchange=render;

q('#areaSearch').onclick = () => {
  areaBounds = atlas.getBounds();
  q('#allArea').hidden = false;
  render();
  statusNode.textContent = q('#result .count').textContent;
};
q('#allArea').onclick = () => {
  areaBounds = null;
  q('#allArea').hidden = true;
  statusNode.textContent = '';
  render();
};

function updateDistricts(previous=q('#district').value){
  const region=q('#region').value;
  const districts=[...new Set(catalog.shops.filter(shop=>shopRegion(shop)===region).map(shop=>shop.district).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,'ko'));
  q('#district').replaceChildren(new Option('전체',''),...districts.map(name=>new Option(name,name)));
  q('#district').disabled=districts.length===0;
  if(districts.includes(previous))q('#district').value=previous;
}

function changeRegion(){
  areaBounds=null;
  q('#allArea').hidden=true;
  render();
  if(!q('#region').value){fitShops();return;}
  const matches=catalog.shops.filter(shop=>matchesArea(shop) && shop.coords);
  if(matches.length)atlas.fitBounds(matches.map(shop=>shop.coords),{padding:[45,55],maxZoom:15});
}

for(const [region] of nationalRegions) q('#region').add(new Option(region,region));
q('#region').onchange=()=>{updateDistricts('');changeRegion();};
q('#district').onchange=changeRegion;
q('#shopQuery').oninput=()=>render();
