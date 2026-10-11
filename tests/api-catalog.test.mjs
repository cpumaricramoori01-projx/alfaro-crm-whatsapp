import test from 'node:test';
import assert from 'node:assert/strict';
import { serveCatalog } from '../api/catalog.mjs';

function response() {
  return { headers: {}, code: null, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; }
  };
}
test('la función publica el catálogo y permite cachear la respuesta correcta', async () => {
  const res = response(); const data = { fetchedAt: '2026-10-11T00:00:00Z', properties: [{ id: 36 }] };
  await serveCatalog({ method: 'GET' }, res, async () => data);
  assert.equal(res.code, 200); assert.deepEqual(res.body, data); assert.match(res.headers['Cache-Control'], /s-maxage=300/);
});
test('un error de origen devuelve 502 sin exponer detalles ni guardarse en caché', async () => {
  const res = response(); await serveCatalog({ method: 'GET' }, res, async () => { throw Error('detalle interno'); });
  assert.equal(res.code, 502); assert.equal(res.headers['Cache-Control'], 'no-store'); assert.equal(JSON.stringify(res.body).includes('detalle interno'), false);
});
test('rechaza escrituras y HEAD no devuelve el cuerpo', async () => {
  const write = response(); await serveCatalog({ method: 'POST' }, write, () => { throw Error('No debe consultarse el origen'); });
  assert.equal(write.code, 405); assert.equal(write.headers.Allow, 'GET, HEAD');
  const head = response(); await serveCatalog({ method: 'HEAD' }, head, async () => ({ properties: [] }));
  assert.equal(head.code, 200); assert.equal(head.body, null);
});
