import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
export function equal(a, b) { const x = Buffer.from(a || ''), y = Buffer.from(b || ''); return x.length === y.length && timingSafeEqual(x,y); }
export function signatureValid(body, signature, secret) {
  return Boolean(secret && /^sha256=[a-f0-9]{64}$/.test(signature || '') && equal(signature, 'sha256=' + createHmac('sha256',secret).update(body).digest('hex')));
}
export async function rawBody(req, limit = 1048576) {
  // Vercel installs a lazy JSON body getter; never invoke it before signature verification.
  const descriptor = Object.getOwnPropertyDescriptor(req,'body');
  if (descriptor && !descriptor.get && descriptor.value !== undefined) {
    if (!Buffer.isBuffer(req.body) && typeof req.body !== 'string') throw new Error('raw-body-required');
    const body = Buffer.from(req.body); if (body.length > limit) throw new Error('body-too-large'); return body;
  }
  return new Promise((resolve,reject)=>{
    let size=0; const parts=[];
    req.on('data',part=>{size+=part.length;if(size>limit){reject(new Error('body-too-large'));return;}parts.push(Buffer.from(part));});
    req.on('end',()=>resolve(Buffer.concat(parts)));req.on('error',reject);
    req.on('aborted',()=>reject(new Error('body-aborted')));
  });
}
export function storageConfig(env) {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) return { url:env.UPSTASH_REDIS_REST_URL, token:env.UPSTASH_REDIS_REST_TOKEN };
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) return { url:env.KV_REST_API_URL, token:env.KV_REST_API_TOKEN };
  return null;
}
export function configured(env) { return Boolean(storageConfig(env)); }
export async function redis(command, env = process.env) {
  const storage = storageConfig(env);
  if (!storage) throw new Error('storage-unconfigured');
  const url = new URL(storage.url); if (url.protocol !== 'https:') throw new Error('storage-url');
  const response = await fetch(url, { method:'POST', headers:{Authorization:'Bearer '+storage.token,'Content-Type':'application/json'}, body:JSON.stringify(command), signal:AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('storage-unavailable'); const data = await response.json();
  if (data.error || !Object.hasOwn(data,'result')) throw new Error('storage-error'); return data.result;
}
export function records(payload, phoneId) {
  if (payload?.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) throw new Error('invalid-event');
  const result = [];
  for (const entry of payload.entry) for (const change of entry.changes || []) {
    const value = change.value;
    if (change.field !== 'messages' || value?.metadata?.phone_number_id !== phoneId) continue;
    for (const message of value.messages || []) {
      if (typeof message.id !== 'string' || !/^\d{5,20}$/.test(message.from || '') || !/^\d+$/.test(message.timestamp || '')) throw new Error('invalid-message');
      const at = new Date(Number(message.timestamp)*1000); if (!Number.isFinite(at.getTime())) throw new Error('invalid-timestamp');
      const contact = value.contacts?.find(c=>c.wa_id === message.from);
      result.push({ id:message.id, phone:message.from, name:contact?.profile?.name || message.from, at:at.toISOString(), type:message.type, text:message.type === 'text' ? String(message.text?.body || '') : `[Mensaje ${message.type || 'no compatible'}]`, message });
    }
  }
  return result;
}
// One sorted-set member per message ID; the message and index are written atomically.
export async function storeEvent(payload, body, env = process.env, command = redis) {
  const items = records(payload,env.WHATSAPP_PHONE_NUMBER_ID);
  const hash = createHash('sha256').update(body).digest('hex');
  const commands = [['SET','alfaro:wa:event:'+hash,body.toString('utf8'),'NX']];
  for (const item of items) { commands.push(['SET','alfaro:wa:message:'+item.id,JSON.stringify(item),'NX']); commands.push(['ZADD','alfaro:wa:messages','NX',Date.parse(item.at),item.id]); }
  // MULTI/EXEC keeps retries safe: even if the response is lost, IDs remain unique.
  const storage = storageConfig(env);
  if (!storage) throw new Error('storage-unconfigured');
  const url = new URL('/multi-exec',storage.url);
  if (url.protocol !== 'https:') throw new Error('storage-url');
  if (command !== redis) return command(commands,env);
  const response = await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+storage.token,'Content-Type':'application/json'},body:JSON.stringify(commands),signal:AbortSignal.timeout(8000)});
  if (!response.ok) throw new Error('storage-unavailable'); const results = await response.json();
  if (!Array.isArray(results) || results.length !== commands.length || results.some(r=>r.error || !Object.hasOwn(r,'result'))) throw new Error('storage-error');
}
