const discoveryVersion=2;
const contentTypes = {
  html:'text/html',js:'text/javascript',css:'text/css',svg:'image/svg+xml',txt:'text/plain'
};

function json(body, status=200) {
  return Response.json(body,{status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}

async function snapshot(db) {
  const row = await db.prepare('SELECT catalog, progress FROM catalog_sync WHERE id=1').first();
  return row ? {catalog:JSON.parse(row.catalog),progress:JSON.parse(row.progress)} : {catalog:seed,progress:null};
}

function publicStatus(progress) {
  if(!progress)return {state:'ready',day:null,completedAt:null};
  return {
    state:progress.state,day:progress.day,completedAt:progress.completedAt,
    checked:progress.checked || 0, remaining:progress.queue.length, errors:progress.errors,
    foodsAdded:progress.foodsAdded, shopsAdded:progress.shopsAdded
  };
}

async function refresh(db) {
  const today=dateInSeoul();
  const fresh={
    version:discoveryVersion, day:today, state:'running', foodsAdded:0, shopsAdded:0, checked:0,
    errors:0, queue:[], seen:[], rankingDate:null, completedAt:null
  };
  await db.prepare('INSERT OR IGNORE INTO catalog_sync (id,catalog,progress) VALUES (1,?,?)')
    .bind(JSON.stringify(seed),JSON.stringify(fresh)).run();
  const lease=crypto.randomUUID();
  const started=Date.now();
  const claimed=await db.prepare('UPDATE catalog_sync SET lease=?,lease_until=? WHERE id=1 AND lease_until<?')
    .bind(lease,started+55_000,started).run();
  if(!claimed.meta.changes)return {state:'busy'};
  try {
    const {catalog,progress:previous}=await snapshot(db);
    const progress=previous.day===today && previous.version===discoveryVersion ? previous : fresh;
    if(progress.state==='done' || progress.state==='partial')return publicStatus(progress);
    progress.state='running';
    try {
      if(!progress.rankingDate)await startDay(catalog,progress,today);
      let remainingBudget=22;
      while(progress.queue.length && remainingBudget>0 && Date.now()-started<14_000){
        const tasks=progress.queue.splice(0,Math.min(3,remainingBudget));
        remainingBudget-=tasks.length;
        const outcomes=await Promise.allSettled(tasks.map(task=>processTask(task,catalog,progress,today)));
        outcomes.forEach((outcome,index)=>{
          if(outcome.status==='fulfilled'){progress.checked++;return}
          const task=tasks[index];
          if(!task.retry)progress.queue.push({...task,retry:true});
          else progress.errors++;
        });
      }
      if(!progress.queue.length){
        progress.state=progress.errors ? 'partial' : 'done';
        progress.completedAt=new Date().toISOString();
        if(!progress.errors || progress.checked)catalog.reviewed=today;
      }
    } catch (error) {
      console.warn('Hanip source:',String(error));
      progress.state='source-unavailable';
    }
    const saved=await db.prepare('UPDATE catalog_sync SET catalog=?,progress=? WHERE id=1 AND lease=?')
      .bind(JSON.stringify(catalog),JSON.stringify(progress),lease).run();
    return saved.meta.changes ? publicStatus(progress) : {state:'busy'};
  } finally {
    await db.prepare('UPDATE catalog_sync SET lease=NULL,lease_until=0 WHERE id=1 AND lease=?').bind(lease).run();
  }
}

function canRefresh(request, url, env) {
  // Hosted site access is owner-only. A scheduled caller uses Sites service authentication
  // and this custom header. Set HANIP_REFRESH_SECRET if the audience expands.
  if(env.HANIP_REFRESH_SECRET)return request.headers.get('X-Hanip-Refresh')===env.HANIP_REFRESH_SECRET;
  const origin=request.headers.get('Origin');
  if(origin)return origin===url.origin && Boolean(request.headers.get('oai-authenticated-user-id'));
  return request.headers.get('X-Hanip-Refresh')==='schedule';
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async()=>{
      let status;
      do { status=await refresh(env.DB); }
      while(status.state==='running');
    })());
  },
  async fetch(request,env) {
    const url=new URL(request.url);
    if(url.pathname==='/api/catalog' && request.method==='GET'){
      const data=await snapshot(env.DB);
      return json({...data.catalog,sync:publicStatus(data.progress)});
    }
    if(url.pathname==='/api/refresh'){
      if(request.method!=='POST')return json({error:'POST 요청만 가능'},405);
      if(!canRefresh(request,url,env))return json({error:'갱신 권한이 필요해요.'},403);
      return json(await refresh(env.DB));
    }
    if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405});
    const path=url.pathname==='/' ? '/index.html' : url.pathname;
    if(!Object.hasOwn(assets,path))return new Response('페이지를 찾을 수 없어요.',{status:404});
    const type=contentTypes[path.split('.').pop()] || 'text/plain';
    return new Response(request.method==='HEAD' ? null : assets[path],{
      headers:{'Content-Type':type+'; charset=utf-8','X-Content-Type-Options':'nosniff'}
    });
  }
};
