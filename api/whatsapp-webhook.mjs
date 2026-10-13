import { equal, rawBody, signatureValid, configured, storeEvent } from '../lib/whatsapp.mjs';
export async function serveWebhook(req,res,verifyToken = process.env.WHATSAPP_VERIFY_TOKEN, env = process.env, store = storeEvent) {
  res.setHeader('Cache-Control','no-store');
  if (req.method === 'GET') {
    if (!verifyToken) return res.status(503).json({error:'Webhook pendiente de configurar.'});
    const params = new URL(req.url,'http://localhost').searchParams;
    if (['hub.mode','hub.verify_token','hub.challenge'].some(k=>params.getAll(k).length !== 1) || params.get('hub.mode') !== 'subscribe' || !equal(params.get('hub.verify_token'),verifyToken) || !params.get('hub.challenge')) return res.status(403).end();
    res.setHeader('Content-Type','text/plain; charset=utf-8'); return res.status(200).end(params.get('hub.challenge'));
  }
  if (req.method !== 'POST') { res.setHeader('Allow','GET, POST'); return res.status(405).end(); }
  if (!env.WHATSAPP_APP_SECRET || !env.WHATSAPP_PHONE_NUMBER_ID || !configured(env)) { res.setHeader('Retry-After','60'); return res.status(503).json({error:'Recepción pendiente de configurar.'}); }
  let body;
  try { body = await rawBody(req); } catch(e) { return res.status(e.message === 'body-too-large' ? 413 : 400).end(); }
  if (!signatureValid(body,req.headers['x-hub-signature-256'],env.WHATSAPP_APP_SECRET)) return res.status(401).end();
  let payload; try { payload=JSON.parse(body.toString('utf8')); if (payload?.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) throw Error(); } catch { return res.status(400).end(); }
  try { await store(payload,body,env); return res.status(200).json({received:true}); }
  catch { res.setHeader('Retry-After','60'); return res.status(503).json({error:'No se pudo guardar el evento.'}); }
}
export default async function handler(req,res) { return serveWebhook(req,res); }
