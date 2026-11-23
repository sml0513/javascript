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
function showShops(shops){
 pins.clearLayers();byShop.clear();
 for(const shop of shops.filter(s=>s.coords&&!s.demo)){
   const label=document.createElement('strong');label.textContent=shop.name;
   const pin=L.marker(shop.coords,{icon:icon('●'),title:shop.name}).addTo(pins).bindTooltip(label,{permanent:true,direction:'top',offset:[0,-13]});
   const box=document.createElement('div');box.textContent=shop.name+' · '+shop.menu;
   if(shop.map){const a=document.createElement('a');a.href=shop.map;a.target='_blank';a.rel='noopener';a.textContent='지도에서 보기 ↗';box.append(document.createElement('br'),a)}
   pin.bindPopup(box);byShop.set(shop,pin);
 }
}
function focusShop(shop){request++;atlas.setView(shop.coords,17);byShop.get(shop)?.openPopup();document.querySelector('.mapbox').scrollIntoView({block:'start'})}
function locate(){
 const ticket=++request;
 if(!navigator.geolocation){statusNode.textContent='현재 위치를 사용할 수 없어 학교 주변을 표시해요.';return}
 statusNode.textContent='현재 위치 확인 중…';
 navigator.geolocation.getCurrentPosition(({coords})=>{
   const point=[coords.latitude,coords.longitude];
   if(positionMarker)positionMarker.setLatLng(point);
   else positionMarker=L.circleMarker(point,{radius:8,color:'white',weight:3,fillColor:'#1675ed',fillOpacity:1}).addTo(atlas).bindTooltip('내 위치');
   if(request===ticket){atlas.setView(point,16);statusNode.textContent='현재 위치를 표시했어요.'}
   else if(statusNode.textContent==='현재 위치 확인 중…')statusNode.textContent='';
 },()=>{if(request===ticket)statusNode.textContent='위치를 확인할 수 없어요. 학교 주변에서 탐색할 수 있어요.'},{timeout:9000,maximumAge:60000});
}
document.querySelector('#school').onclick=()=>{request++;atlas.setView(schoolCenter,15);statusNode.textContent='학교 주변'};
document.querySelector('#locate').onclick=locate;
locate();
