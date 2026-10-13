import { configured, equal, redis } from '../lib/whatsapp.mjs';
export async function serveInbox(req,res,env=process.env,command=redis) {
  res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method !== 'GET') { res.setHeader('Allow','GET');return res.status(405).end(); }
  if(!configured(env) || !env.CRM_INBOX_TOKEN || env.CRM_INBOX_TOKEN.length < 32) return res.status(503).json({error:'Bandeja pendiente de configurar.'});
  if(!equal(req.headers.authorization,'Bearer '+env.CRM_INBOX_TOKEN)) {
    // Fixed global budget for failed authentication; Vercel instances share the counter.
    try { const key='alfaro:wa:auth:'+Math.floor(Date.now()/60000); const count=await command(['INCR',key],env); await command(['EXPIRE',key,120],env); if(Number(count)>30) return res.status(429).json({error:'Demasiados intentos. Espera un minuto.'}); }
    catch { return res.status(503).json({error:'Servicio temporalmente no disponible.'}); }
    return res.status(401).json({error:'Clave de acceso incorrecta.'});
  }
  const params=new URL(req.url,'http://localhost').searchParams;
  const offsetText=params.get('offset') || '0'; if(!/^\d{1,7}$/.test(offsetText)) return res.status(400).end();
  const offset=Number(offsetText);
  try {
    const ids=await command(['ZREVRANGE','alfaro:wa:messages',offset,offset+99],env);
    const rows=ids.length ? await command(['MGET',...ids.map(id=>'alfaro:wa:message:'+id)],env):[];
    const messages=rows.filter(Boolean).map(row=>{const {message,...item}=JSON.parse(row);return item;});
    return res.status(200).json({messages,nextOffset:ids.length===100 ? offset+100:null});
  } catch { return res.status(503).json({error:'No se pudieron consultar los mensajes.'}); }
}
export default async function handler(req,res) { return serveInbox(req,res); }
