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
function render(limit = 30) {
  if(typeof limit !== "number") limit=30;
  const query=q("#shopQuery").value.trim().toLocaleLowerCase();
  const food = catalog.foods.find(item => item.id === selected);
  for (const button of q('#cards').children) {
    const active = button.dataset.id === selected;
    button.setAttribute('aria-pressed', active);
    button.querySelector('em').textContent = active ? '✓ 선택됨' : '선택하기';
  }
  const result = q('#result');
  const shops = catalog.shops.filter(shop => (!query || [shop.name,shop.menu,shop.address,shop.district].join(' ').toLocaleLowerCase().includes(query)) && (!q('#district').value || shop.district === q('#district').value) && (!selected || shop.food === selected) && catalog.foods.some(f=>f.id===shop.food) && (!q('#real').checked || Boolean(shop.checked)) && (!areaBounds || (shop.coords && areaBounds.contains(shop.coords))));

  result.replaceChildren(element('div', (areaBounds ? '검색 지역 · ' : '') + (food?.name || '전체 음식') + ' · ' + shops.length + '곳', 'count'));
  if (!shops.length) result.append(element('p', areaBounds ? '이 지역에 등록된 판매처가 없어요.' : '판매처를 확인 중이에요', 'empty'));
  for (const shop of shops.slice(0,limit)) {
    const card = element('article'), info = element('div', '', 'info'), title = element('h3', shop.name);
    const pin = element('div','','pin');
    pin.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
    if(shop.demo) title.append(element('small','시연용 예시','tag'));
    info.append(title,element('div',[shop.district,shop.menu].filter(Boolean).join(' · ')),element('div','메뉴 확인일 · '+(shop.checked || '미확인'),'meta'));
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
    more.onclick=()=>render(limit+30);
    result.append(more);
  }
}
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
showShops(catalog.shops.filter(shop=>catalog.foods.some(food=>food.id===shop.food)));
q('#allPins').onclick=()=>{
 request++;
 selected=null;
 areaBounds=null;
 q('#allArea').hidden=true;
 q('#real').checked=false;
 q('#district').value='';
 q('#shopQuery').value='';
 atlas.closePopup();
 fitShops();
 render();
 statusNode.textContent='전체 판매처를 표시했어요.';
};
q('#real').onchange=render;
q('#review').textContent='유행 자료 확인 · '+catalog.reviewed;
render();

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

const districts='강남 강동 강북 강서 관악 광진 구로 금천 노원 도봉 동대문 동작 마포 서대문 서초 성동 성북 송파 양천 영등포 용산 은평 종로 중 중랑'.split(' ').map(d=>d+'구');
for(const district of districts) q('#district').add(new Option(district,district));
const covered=new Set(catalog.shops.map(s=>s.district).filter(Boolean));
q('#coverage').textContent='서울 '+covered.size+'/25개 구 · 공개 메뉴와 구매 후기에서 찾은 판매처예요. 당일 재고는 방문 전 확인해 주세요.';
q('#district').onchange=()=>{
 areaBounds=null;
 q('#allArea').hidden=true;
 render();
 const matches=catalog.shops.filter(s=>(!q('#district').value || s.district===q('#district').value) && s.coords);
 if(matches.length)atlas.fitBounds(matches.map(s=>s.coords),{padding:[45,55],maxZoom:15});
};

q('#shopQuery').oninput=()=>render();
