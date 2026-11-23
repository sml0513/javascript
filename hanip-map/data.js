// 음식은 foods, 판매처는 shops에서 수정합니다. food는 foods의 id와 일치해야 합니다.
// checked에는 메뉴판을 직접 본 날짜만 기록합니다. 예시는 demo:true, 날짜와 지도는 비워 둡니다.
const catalog = {
 reviewed:'2026-11-23',
 school:{lat:37.659024,lon:127.078139},
 foods:[
 {id:'salt',name:'소금빵',image:'salt.svg',reason:'11월 인스타그램 시식 후기와 유튜브에서 변형 소금빵이 소개됐어요.',more:[{label:'11.21 인스타그램 시식 후기',url:'https://www.instagram.com/p/DgABIHrna4t/'},{label:'11.15 유튜브 먹방',url:'https://www.youtube.com/watch?v=ncIQIUin6TY'}],source:'연합뉴스 · 한국신용데이터 판매 분석',url:'https://www.yna.co.kr/amp/view/AKR20251003055500002'},
 {id:'pizza',name:'피자설기',image:'pizza.svg',reason:'인스타그램 구매 후기와 11월 유튜브 시식 영상에 등장한 퓨전 떡이에요.',source:'나스미디어 · 11월 디저트 트렌드',url:'https://blog.nasmedia.co.kr/entry/2611-lifestyletrend-eat',more:[{label:'11.01 인스타그램 구매 후기',url:'https://www.instagram.com/p/DfMyGWLk3EC/'},{label:'유튜브 · 케인 시식 영상',url:'https://www.youtube.com/watch?v=CkUhifVVzBY'}]}],
 shops:[
 {food:'salt',name:'본노엘 중계은행사거리점',review:{url:'https://m.place.naver.com/restaurant/1697696609/review/visitor',checked:'2026-11-23',visit:'2026-11-23',stars:4.5,summary:'빵 종류가 늘었고 맛있는 빵이 많아 지인에게 추천한다는 후기예요.'},coords:[37.649648,127.076474],menu:'고짠고짠 소금빵',checked:'2026-11-23',source:'https://bizw.kr/brand/197618',map:'https://m.place.naver.com/restaurant/1697696609/location'},
 {food:'salt',name:'밀스',review:{url:'https://m.place.naver.com/restaurant/1249383114/review/visitor',checked:'2026-11-23',visit:'2026-10-24',stars:5,summary:'모카소금빵과 휘낭시에, 초코바게트를 추천하고 빵 종류가 다양해졌다고 했어요.'},coords:[37.6630617,127.0734109],menu:'소금빵',checked:'2026-11-23',source:'https://m.place.naver.com/restaurant/1249383114/menu/list',map:'https://m.place.naver.com/restaurant/1249383114/location'},
 {food:'pizza',name:'중앙떡집',menu:'피자설기',coords:[37.650035,127.061257],sourceLabel:'방문자 구매 후기 ↗',source:'https://m.place.naver.com/place/1491847415/review/visitor',map:'https://m.place.naver.com/place/1491847415/location',review:{placeStars:4.81,url:'https://m.place.naver.com/place/1491847415/review/visitor',checked:'2026-11-23',visit:'2026-11-17',summary:'피자설기의 속이 실하고 떡이 쫀득했다는 구매 후기예요.'}}]
};
