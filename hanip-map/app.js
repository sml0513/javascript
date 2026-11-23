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
let selected = catalog.foods[0].id;
let areaBounds = null;
function render() {
  const food = catalog.foods.find(item => item.id === selected);
  for (const button of q('#cards').children) {
    const active = button.dataset.id === selected;
    button.setAttribute('aria-pressed', active);
    button.querySelector('em').textContent = active ? '✓ 선택됨' : '선택하기';
  }
  const result = q('#result');
  const shops = catalog.shops.filter(shop => shop.food === selected && (!q('#real').checked || !shop.demo) && (!areaBounds || (shop.coords && areaBounds.contains(shop.coords))));
  showShops(shops);
  result.replaceChildren(element('div', (areaBounds ? '검색 지역 · ' : '') + food.name + ' · ' + shops.length + '곳', 'count'));
  if (!shops.length) result.append(element('p', areaBounds ? '이 지역에 등록된 판매처가 없어요.' : '판매처를 확인 중이에요', 'empty'));
  for (const shop of shops) {
    const card = element('article'), info = element('div', '', 'info'), title = element('h3', shop.name);
    const pin = element('div','','pin');
    pin.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
    if(shop.demo) title.append(element('small','시연용 예시','tag'));
    info.append(title,element('div',shop.menu),element('div','메뉴 확인일 · '+(shop.checked || '미확인'),'meta'));
    if(shop.source) info.append(link('메뉴판 보기 ↗',shop.source,'meta'));
    if(shop.coords) {
      const show = element('button','지도에서 위치 찾기','focus-shop');
      show.onclick = () => focusShop(shop);
      info.append(show);
    }
    card.append(pin,info,shop.map ? link('지도에서 보기 ↗',shop.map,'link') : element('span','지도 링크 준비 중','pending'));
    result.append(card);
  }
}
for(const food of catalog.foods) {
  const b = element('button','','food'), img = element('img');
  b.dataset.id = food.id; img.src = food.image; img.alt = '';
  b.append(element('em'),element('strong',food.name),element('span',food.reason),img);
  b.onclick = () => { selected = food.id; render(); };
  q('#cards').append(b);
  const p=element('p',food.name+' · '); p.append(link(food.source,food.url)); for (const source of food.more || []) p.append(' · ',link(source.label,source.url));
  q('#evidence').append(p);
}
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
