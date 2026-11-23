const schoolCenter=[catalog.school.lat,catalog.school.lon];
const atlas=L.map('atlas',{zoomControl:false,maxZoom:19,minZoom:2}).setView(schoolCenter,15);
L.control.zoom({position:'bottomright',zoomInTitle:'확대',zoomOutTitle:'축소'}).addTo(atlas);
const layers={
 street:L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
 sat:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community'})
};
const statusNode=document.querySelector('#status');
let active=layers.street.addTo(atlas), request=0, positionMarker;
atlas.on('dragstart zoomstart',()=>{request++});
for(const [id,layer] of Object.entries(layers)){
 layer.on('tileerror',()=>{if(active===layer)statusNode.textContent='지도 이미지를 불러오지 못했어요. 연결을 확인해 주세요.'});
 document.getElementById(id).onclick=()=>{
   if(active===layer)return;
   atlas.removeLayer(active);active=layer;active.addTo(atlas);
   statusNode.textContent='';
   for(const key of Object.keys(layers)) document.getElementById(key).setAttribute('aria-pressed',key===id);
 };
}
function icon(label,extra=''){
 return L.divIcon({className:'dotpin '+extra,html:label,iconSize:[31,31],iconAnchor:[15,15]});
}
L.marker(schoolCenter,{icon:icon('校','campus'),title:'미래산업과학고등학교'}).addTo(atlas).bindTooltip('미래산업과학고등학교');
const pins=L.layerGroup().addTo(atlas), byShop=new Map();
let mapShops=[];
function showShops(shops){
 mapShops=shops.filter(s=>s.coords&&!s.demo);
 drawShops();
}
function drawShops(){
 pins.clearLayers();byShop.clear();
 const groups=new Map();
 for(const shop of mapShops){
   const pt=atlas.project(shop.coords);
   const key=atlas.getZoom()<15 ? Math.floor(pt.x/48)+','+Math.floor(pt.y/48) : shop.coords.join(',');
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(shop);
 }
 for(const group of groups.values()){
   if(group.length>1){
     const bounds=L.latLngBounds(group.map(shop=>shop.coords));
     const marker=L.marker(bounds.getCenter(),{icon:icon(String(group.length),'group-pin'),title:group.length+'개 판매처 확대'}).addTo(pins);
     if(atlas.getZoom()>=15){
       const list=document.createElement('div');
       for(const shop of group){
         const row=element('p',shop.name+' · '+shop.menu+' ');
         row.append(link('지도 열기 ↗',shop.map));
         list.append(row);
         byShop.set(shop,marker);
       }
       marker.bindPopup(list);
     }else{
       marker.on('click',()=>atlas.fitBounds(bounds,{padding:[40,55],maxZoom:17}));
     }
     continue;
   }
   const shop=group[0];
   const label=document.createElement('strong');label.textContent=shop.name+' · '+(catalog.foods.find(food=>food.id===shop.food)?.name || shop.menu);
   const pin=L.marker(shop.coords,{icon:icon(shop.food==='pizza'?'◆':'●',shop.food==='pizza'?'pizza-pin':''),title:shop.name}).addTo(pins).bindTooltip(label,{permanent:false,direction:'top',offset:[0,-13]});
   const box=element('div','','review-popup');
   box.append(element('strong',shop.name),element('div',shop.menu));
   const review=shop.review;
   if(review){
     box.append(element('b',review.placeStars ? '네이버 장소 별점  ★ '+review.placeStars+' / 5' : '방문자 한 명의 별점  ★ '+review.stars+' / 5'),
       element('p',review.summary),element('small',review.visit+' 방문 · 후기 요약'),
       link('네이버 방문자 후기 전체 보기 ↗',review.url),
       element('small','자료 확인 '+review.checked));
   }else{
     box.append(element('p','등록된 후기 정보가 없어요.'));
   }
   if(shop.map) box.append(link('지도에서 보기 ↗',shop.map));
   pin.bindPopup(box);byShop.set(shop,pin);
 }
}
atlas.on('zoomend',drawShops);
function focusShop(shop){request++;atlas.setView(shop.coords,17,{animate:false});byShop.get(shop)?.openPopup();document.querySelector('.mapbox').scrollIntoView({block:'start'})}
function fitShops(extra=[]){
 const points=catalog.shops.filter(s=>!s.demo && s.coords && catalog.foods.some(f=>f.id===s.food)).map(s=>s.coords);
 atlas.fitBounds([schoolCenter,...points,...extra],{paddingTopLeft:[65,85],paddingBottomRight:[65,45],maxZoom:16,animate:false});
}
function locate(initial=false){
 const ticket=++request;
 if(!navigator.geolocation){statusNode.textContent='현재 위치를 사용할 수 없어 서울 판매처를 표시해요.';return}
 statusNode.textContent='현재 위치 확인 중…';
 navigator.geolocation.getCurrentPosition(({coords})=>{
   const point=[coords.latitude,coords.longitude];
   if(positionMarker)positionMarker.setLatLng(point);
   else positionMarker=L.circleMarker(point,{radius:8,color:'white',weight:3,fillColor:'#1675ed',fillOpacity:1}).addTo(atlas).bindTooltip('내 위치');
   if(request===ticket){if(initial)fitShops([point]);else atlas.setView(point,16);statusNode.textContent='현재 위치를 표시했어요.'}
   else if(statusNode.textContent==='현재 위치 확인 중…')statusNode.textContent='';
 },()=>{if(request===ticket)statusNode.textContent='위치를 확인할 수 없어요. 서울 판매처를 탐색할 수 있어요.'},{timeout:9000,maximumAge:60000});
}
document.querySelector('#school').onclick=()=>{request++;atlas.setView(schoolCenter,15);statusNode.textContent='학교 주변'};
document.querySelector('#locate').onclick=()=>locate();
fitShops();
locate(true);
